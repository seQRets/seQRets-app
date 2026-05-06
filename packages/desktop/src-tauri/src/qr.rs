// QR-code decoding via the `rqrr` Rust crate.
//
// Why this exists: macOS Tauri uses WKWebView (WebKit), and WebKit's WKWebView
// does NOT implement the BarcodeDetector Web API. The desktop's JS-side
// `decodeQR()` therefore falls through to `jsQR`, which has well-documented
// trouble decoding dense (high-version) QR codes — exactly the kind seQRets
// generates when the share payload is a multi-sig descriptor or any larger
// secret encrypted at M-level error correction.
//
// `rqrr` is a much more capable QR decoder. It runs in Rust here (no IPC
// overhead concerns for the rare drag-and-drop case), and is exposed to the
// JS layer as a Tauri command that the desktop's decoder pipeline can fall
// back to when BarcodeDetector is absent and before resorting to jsQR.

use base64::{engine::general_purpose::STANDARD, Engine};

/// Decode a QR code from a base64-encoded image (PNG or JPEG).
///
/// The JS side reads the dropped file via `FileReader.readAsDataURL`, which
/// yields a string of the form `data:image/png;base64,iVBORw0K...`. The
/// caller is expected to strip the `data:...;base64,` prefix and pass only
/// the base64 payload as `data_b64`.
///
/// Returns `Some(decoded_text)` on success, or `None` if:
///   - the base64 didn't decode
///   - the bytes weren't a recognizable image
///   - no QR code was found in the image
///   - the QR code was found but couldn't be decoded
///
/// All failure modes collapse to `None` so the JS layer can cleanly fall
/// through to its next decoder (jsQR).
#[tauri::command]
pub fn qr_decode(data_b64: String) -> Option<String> {
    // 1. Base64 → raw bytes
    let bytes = STANDARD.decode(&data_b64).ok()?;

    // 2. Bytes → image (image crate auto-detects PNG/JPEG from magic bytes)
    let img = image::load_from_memory(&bytes).ok()?;

    // 3. Downscale very large images before handing off to rqrr.
    //    Canvas-rendered Qard PNGs come in at ~2240×3176 (4× scale for print
    //    quality). rqrr's grid detection scales with image area, so a 7-MP
    //    input takes several seconds. Capping the longest side at 2000px
    //    keeps the QR comfortably oversampled (~8 px/module on a v22 QR)
    //    while cutting rqrr's processing area roughly in half.
    let max_side: u32 = 2000;
    let (w, h) = (img.width(), img.height());
    let img = if w.max(h) > max_side {
        let scale = max_side as f32 / w.max(h) as f32;
        let nw = (w as f32 * scale).round() as u32;
        let nh = (h as f32 * scale).round() as u32;
        // Triangle filter (bilinear) is fast and preserves QR module edges
        // adequately. Lanczos would be sharper but slower with no scan-quality
        // benefit at this resolution.
        img.resize(nw, nh, image::imageops::FilterType::Triangle)
    } else {
        img
    };

    // 4. Convert to luma8 (grayscale) — rqrr expects this format
    let gray = img.into_luma8();

    // 5. Locate QR grids in the image
    let mut prepared = rqrr::PreparedImage::prepare(gray);
    let grids = prepared.detect_grids();

    // 6. Decode the first successfully-decoded grid. Multiple grids in one
    //    image are rare for our use case (one Qard per file) but we handle
    //    it gracefully by returning the first that decodes.
    for grid in grids {
        if let Ok((_meta, content)) = grid.decode() {
            return Some(content);
        }
    }

    None
}
