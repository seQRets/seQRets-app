//! Locker file storage: finding the user's cloud-drive folders and saving
//! Locker files safely.
//!
//! The Locker file is already encrypted; this module never sees anything
//! secret. Its job is to make sure a save can never leave the only copy of a
//! Locker damaged or overwrite something it shouldn't:
//!
//! - Writes are atomic: write a hidden temp file next to the target, fsync,
//!   then rename over the target. A crash or a sync client reading mid-write
//!   sees either the old file or the new one, never half of one.
//! - Only Locker files are written, and only a Locker file (or nothing) is
//!   replaced: the new contents must parse as a Locker file, the target name
//!   must end in `.json`, and an existing target must itself be a Locker file
//!   of the same Qard set. Anything else is refused.
//! - Never overwrite a newer version: when the caller says which version it
//!   opened (`expected_seq`), the save is refused if the file on disk has a
//!   different version (for example, it was edited on another computer).
//!   Without `expected_seq` (a new file or a copy), an existing file is only
//!   replaced by the same or a later version.
//! - Symlinks and non-regular files are refused, and on unix the temp file is
//!   opened with O_NOFOLLOW.
//!
//! Cloud folders are found by looking where each provider's desktop client
//! puts its synced folder. Nothing signs in to anything — the cloud client
//! syncs an ordinary folder.

use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

/// Locker files hold attached documents (50 MB of files at most, base64'd
/// twice on the way in). 128 MB leaves headroom without letting a bad call
/// fill the disk.
const MAX_LOCKER_BYTES: usize = 128 * 1024 * 1024;

/// Prefixes the TypeScript side matches on to show plain-language messages.
pub const ERR_CONFLICT: &str = "LOCKER_CONFLICT";
pub const ERR_DIFFERENT_SET: &str = "LOCKER_DIFFERENT_SET";
pub const ERR_NOT_A_LOCKER: &str = "LOCKER_NOT_A_LOCKER";

// ── Cloud folders ────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CloudFolder {
    /// "iCloud Drive", "Google Drive", "Dropbox" or "OneDrive".
    pub provider: String,
    /// The account, when the client names its folder after it (e.g. a
    /// Google account's email address); shown only to tell two apart.
    pub account: Option<String>,
    /// The synced folder itself (where a `seQRets` folder would go).
    pub path: String,
}

fn is_dir(p: &Path) -> bool {
    fs::metadata(p).map(|m| m.is_dir()).unwrap_or(false)
}

fn folder(provider: &str, account: Option<String>, path: &Path) -> CloudFolder {
    CloudFolder {
        provider: provider.to_string(),
        account,
        path: path.to_string_lossy().into_owned(),
    }
}

/// Sorted directory entry names (sorted so results are stable).
fn dir_names(dir: &Path) -> Vec<String> {
    let mut names: Vec<String> = fs::read_dir(dir)
        .map(|it| {
            it.filter_map(|e| e.ok())
                .filter(|e| e.path().is_dir())
                .map(|e| e.file_name().to_string_lossy().into_owned())
                .collect()
        })
        .unwrap_or_default();
    names.sort();
    names
}

/// macOS: iCloud Drive's fixed folder plus the File Provider folders under
/// ~/Library/CloudStorage (Google Drive, Dropbox, OneDrive), and the older
/// ~/Dropbox location.
fn detect_macos(home: &Path) -> Vec<CloudFolder> {
    let mut found = Vec::new();

    let icloud = home.join("Library/Mobile Documents/com~apple~CloudDocs");
    if is_dir(&icloud) {
        found.push(folder("iCloud Drive", None, &icloud));
    }

    let storage = home.join("Library/CloudStorage");
    let names = dir_names(&storage);
    let suffix = |name: &str, prefix: &str| -> Option<String> {
        name.strip_prefix(prefix).map(|s| s.to_string()).filter(|s| !s.is_empty())
    };
    for name in &names {
        if let Some(rest) = name.strip_prefix("GoogleDrive") {
            let account = suffix(rest, "-");
            let root = storage.join(name);
            let my_drive = root.join("My Drive");
            found.push(folder("Google Drive", account, if is_dir(&my_drive) { &my_drive } else { &root }));
        }
    }
    let mut dropbox_found = false;
    for name in &names {
        if name == "Dropbox" || name.starts_with("Dropbox-") {
            found.push(folder("Dropbox", suffix(name, "Dropbox-"), &storage.join(name)));
            dropbox_found = true;
        }
    }
    if !dropbox_found && is_dir(&home.join("Dropbox")) {
        found.push(folder("Dropbox", None, &home.join("Dropbox")));
    }
    for name in &names {
        if name == "OneDrive" || name.starts_with("OneDrive-") {
            found.push(folder("OneDrive", suffix(name, "OneDrive-"), &storage.join(name)));
        }
    }
    found
}

/// Windows: iCloud for Windows' folder, Google Drive for desktop's drive
/// letter ("G:\My Drive"), Dropbox's own info.json, and OneDrive's
/// environment variables.
fn detect_windows(
    home: &Path,
    env: &dyn Fn(&str) -> Option<String>,
    drive_roots: &[PathBuf],
) -> Vec<CloudFolder> {
    let mut found = Vec::new();

    let icloud = home.join("iCloudDrive");
    if is_dir(&icloud) {
        found.push(folder("iCloud Drive", None, &icloud));
    }

    for root in drive_roots {
        let my_drive = root.join("My Drive");
        if is_dir(&my_drive) {
            found.push(folder("Google Drive", None, &my_drive));
        }
    }

    // Dropbox writes its folder locations to info.json.
    let mut dropbox: Vec<PathBuf> = Vec::new();
    for var in ["APPDATA", "LOCALAPPDATA"] {
        let Some(base) = env(var) else { continue };
        let Ok(text) = fs::read_to_string(Path::new(&base).join("Dropbox").join("info.json")) else { continue };
        let Ok(info) = serde_json::from_str::<Value>(&text) else { continue };
        for kind in ["personal", "business"] {
            if let Some(p) = info.get(kind).and_then(|v| v.get("path")).and_then(|v| v.as_str()) {
                let p = PathBuf::from(p);
                if is_dir(&p) && !dropbox.contains(&p) {
                    dropbox.push(p);
                }
            }
        }
    }
    if dropbox.is_empty() && is_dir(&home.join("Dropbox")) {
        dropbox.push(home.join("Dropbox"));
    }
    for p in &dropbox {
        found.push(folder("Dropbox", None, p));
    }

    let mut onedrive: Vec<PathBuf> = Vec::new();
    for var in ["OneDriveConsumer", "OneDriveCommercial", "OneDrive"] {
        if let Some(p) = env(var).map(PathBuf::from) {
            if is_dir(&p) && !onedrive.contains(&p) {
                onedrive.push(p);
            }
        }
    }
    for p in &onedrive {
        found.push(folder("OneDrive", None, p));
    }
    found
}

/// The cloud-drive folders on this computer, in a fixed order: iCloud Drive,
/// Google Drive, Dropbox, OneDrive. Empty on Linux (no standard locations)
/// and when none is set up.
#[tauri::command]
pub fn cloud_folders() -> Vec<CloudFolder> {
    let home = std::env::var_os(if cfg!(windows) { "USERPROFILE" } else { "HOME" }).map(PathBuf::from);
    let Some(home) = home else { return Vec::new() };
    if cfg!(target_os = "macos") {
        detect_macos(&home)
    } else if cfg!(windows) {
        // C: is the system drive; Google Drive mounts on a later letter.
        let roots: Vec<PathBuf> = ('D'..='Z').map(|c| PathBuf::from(format!("{c}:\\"))).collect();
        detect_windows(&home, &|k| std::env::var(k).ok(), &roots)
    } else {
        Vec::new()
    }
}

// ── Safe save ────────────────────────────────────────────────────────

/// The outer fields of a Locker file that a save decision needs. Mirrors
/// `parseLockerFile` in @seqrets/crypto (format, integer v ≥ 1, setId, seq).
#[derive(Debug, PartialEq, Eq)]
struct LockerHeader {
    set_id: String,
    seq: u64,
}

fn parse_header(text: &str) -> Option<LockerHeader> {
    let obj: Value = serde_json::from_str(text).ok()?;
    if obj.get("format")?.as_str()? != "seqrets-locker" {
        return None;
    }
    if obj.get("v")?.as_u64()? < 1 {
        return None;
    }
    let set_id = obj.get("setId")?.as_str()?.to_string();
    let seq = obj.get("seq")?.as_u64()?;
    obj.get("salt")?.as_str()?;
    obj.get("data")?.as_str()?;
    Some(LockerHeader { set_id, seq })
}

/// Refuse anything that isn't a regular file. Ok(false) when nothing exists.
fn existing_regular_file(path: &Path) -> Result<bool, String> {
    match fs::symlink_metadata(path) {
        Ok(meta) if meta.file_type().is_symlink() => {
            Err("Refusing to save: the Locker's location is a link to somewhere else.".into())
        }
        Ok(meta) if !meta.is_file() => Err("Refusing to save: the Locker's location is not a file.".into()),
        Ok(_) => Ok(true),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(false),
        Err(e) => Err(format!("Could not check the Locker's location: {e}")),
    }
}

fn save_locker_file(path: &Path, contents: &str, expected_seq: Option<u64>) -> Result<(), String> {
    let name = path.file_name().map(|n| n.to_string_lossy().into_owned()).unwrap_or_default();
    if !name.to_ascii_lowercase().ends_with(".json") || name.starts_with('.') {
        return Err(format!("{ERR_NOT_A_LOCKER}: A Locker file name must end in .json."));
    }
    if contents.len() > MAX_LOCKER_BYTES {
        return Err("This Locker is too large to save.".into());
    }
    let new = parse_header(contents)
        .ok_or_else(|| format!("{ERR_NOT_A_LOCKER}: Refusing to save something that is not a Locker file."))?;

    let parent = path.parent().filter(|p| !p.as_os_str().is_empty())
        .ok_or("The Locker's folder could not be found.")?;
    if !is_dir(parent) {
        // Create one missing folder level (the `seQRets` folder inside a
        // cloud drive), never a whole new tree.
        let grandparent_ok = parent.parent().map(is_dir).unwrap_or(false);
        if !grandparent_ok {
            return Err("The Locker's folder could not be found.".into());
        }
        fs::create_dir(parent).map_err(|e| format!("Could not create the folder: {e}"))?;
    }

    if existing_regular_file(path)? {
        let meta = fs::metadata(path).map_err(|e| format!("Could not check the existing file: {e}"))?;
        if meta.len() as usize > MAX_LOCKER_BYTES {
            return Err(format!("{ERR_NOT_A_LOCKER}: Refusing to replace a file that is not a Locker."));
        }
        let text = fs::read_to_string(path).map_err(|e| format!("Could not read the existing file: {e}"))?;
        let old = parse_header(&text)
            .ok_or_else(|| format!("{ERR_NOT_A_LOCKER}: Refusing to replace a file that is not a Locker."))?;
        if old.set_id != new.set_id {
            return Err(format!("{ERR_DIFFERENT_SET}: A different Locker is already saved here."));
        }
        let ok = match expected_seq {
            Some(seq) => old.seq == seq,
            None => old.seq <= new.seq,
        };
        if !ok {
            return Err(format!(
                "{ERR_CONFLICT}: The Locker file here is version {}, but the one open is version {}. It was changed somewhere else.",
                old.seq,
                expected_seq.unwrap_or(new.seq)
            ));
        }
    } else if expected_seq.is_some() {
        // The file the Locker was opened from has gone (moved, renamed or
        // deleted elsewhere). Don't silently recreate it.
        return Err(format!("{ERR_CONFLICT}: The Locker file is no longer where it was opened from."));
    }

    let tmp_path = parent.join(format!(".{name}.seqrets-tmp"));
    if fs::symlink_metadata(&tmp_path).is_ok() {
        let _ = fs::remove_file(&tmp_path);
    }
    let write = || -> Result<(), String> {
        let mut opts = fs::OpenOptions::new();
        opts.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            opts.mode(0o600);
            opts.custom_flags(libc::O_NOFOLLOW);
        }
        let mut f = opts.open(&tmp_path).map_err(|e| format!("Could not save the Locker: {e}"))?;
        f.write_all(contents.as_bytes()).map_err(|e| format!("Could not save the Locker: {e}"))?;
        f.sync_all().map_err(|e| format!("Could not save the Locker: {e}"))?;
        Ok(())
    };
    if let Err(e) = write() {
        let _ = fs::remove_file(&tmp_path);
        return Err(e);
    }
    if let Err(e) = fs::rename(&tmp_path, path) {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Could not save the Locker: {e}"));
    }
    #[cfg(unix)]
    if let Ok(dir) = fs::File::open(parent) {
        let _ = dir.sync_all();
    }
    Ok(())
}

/// Save a Locker file at `path`, replacing the previous copy atomically.
/// `expected_seq` is the version the open Locker was loaded as; pass null
/// for a new file or a copy. Errors starting with LOCKER_CONFLICT,
/// LOCKER_DIFFERENT_SET or LOCKER_NOT_A_LOCKER are refusals, not failures.
#[tauri::command]
pub fn locker_save_file(path: String, contents: String, expected_seq: Option<u64>) -> Result<(), String> {
    save_locker_file(Path::new(&path), &contents, expected_seq)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// A fresh, empty directory under the system temp dir.
    fn scratch() -> PathBuf {
        let n = COUNTER.fetch_add(1, Ordering::SeqCst);
        let dir = std::env::temp_dir().join(format!("seqrets-locker-files-{}-{n}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn locker(set_id: &str, seq: u64) -> String {
        format!(r#"{{"format":"seqrets-locker","v":1,"setId":"{set_id}","seq":{seq},"savedAt":"2026-10-08T00:00:00.000Z","salt":"c2FsdA==","data":"ZGF0YQ=="}}"#)
    }

    fn leftovers(dir: &Path) -> Vec<String> {
        dir_names_all(dir).into_iter().filter(|n| n.ends_with(".seqrets-tmp")).collect()
    }

    fn dir_names_all(dir: &Path) -> Vec<String> {
        fs::read_dir(dir).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().into_owned()).collect()
    }

    #[test]
    fn saves_a_new_locker_and_leaves_no_temp_file() {
        let dir = scratch();
        let path = dir.join("seQRets-Locker-abc.json");
        save_locker_file(&path, &locker("abc", 1), None).unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), locker("abc", 1));
        assert!(leftovers(&dir).is_empty());
    }

    #[test]
    fn replaces_the_version_it_opened() {
        let dir = scratch();
        let path = dir.join("Locker.json");
        save_locker_file(&path, &locker("abc", 1), None).unwrap();
        save_locker_file(&path, &locker("abc", 2), Some(1)).unwrap();
        assert_eq!(parse_header(&fs::read_to_string(&path).unwrap()).unwrap().seq, 2);
    }

    #[test]
    fn refuses_to_overwrite_a_version_changed_elsewhere() {
        let dir = scratch();
        let path = dir.join("Locker.json");
        save_locker_file(&path, &locker("abc", 5), None).unwrap();
        // Opened as version 3; the file is now version 5.
        let err = save_locker_file(&path, &locker("abc", 4), Some(3)).unwrap_err();
        assert!(err.starts_with(ERR_CONFLICT), "{err}");
        assert_eq!(parse_header(&fs::read_to_string(&path).unwrap()).unwrap().seq, 5);
    }

    #[test]
    fn a_copy_never_replaces_a_newer_version() {
        let dir = scratch();
        let path = dir.join("Locker.json");
        save_locker_file(&path, &locker("abc", 5), None).unwrap();
        let err = save_locker_file(&path, &locker("abc", 4), None).unwrap_err();
        assert!(err.starts_with(ERR_CONFLICT), "{err}");
        // Same version (Save a Copy over itself) is fine.
        save_locker_file(&path, &locker("abc", 5), None).unwrap();
    }

    #[test]
    fn refuses_when_the_opened_file_has_gone() {
        let dir = scratch();
        let err = save_locker_file(&dir.join("Locker.json"), &locker("abc", 2), Some(1)).unwrap_err();
        assert!(err.starts_with(ERR_CONFLICT), "{err}");
    }

    #[test]
    fn refuses_a_different_locker() {
        let dir = scratch();
        let path = dir.join("Locker.json");
        save_locker_file(&path, &locker("abc", 1), None).unwrap();
        let err = save_locker_file(&path, &locker("xyz", 9), None).unwrap_err();
        assert!(err.starts_with(ERR_DIFFERENT_SET), "{err}");
    }

    #[test]
    fn only_writes_and_replaces_locker_files() {
        let dir = scratch();
        // Contents that aren't a Locker.
        let err = save_locker_file(&dir.join("x.json"), r#"{"hello":1}"#, None).unwrap_err();
        assert!(err.starts_with(ERR_NOT_A_LOCKER), "{err}");
        // A name that isn't .json.
        let err = save_locker_file(&dir.join("notes.txt"), &locker("abc", 1), None).unwrap_err();
        assert!(err.starts_with(ERR_NOT_A_LOCKER), "{err}");
        // An existing file that isn't a Locker is never replaced.
        let other = dir.join("settings.json");
        fs::write(&other, r#"{"theme":"dark"}"#).unwrap();
        let err = save_locker_file(&other, &locker("abc", 1), None).unwrap_err();
        assert!(err.starts_with(ERR_NOT_A_LOCKER), "{err}");
        assert_eq!(fs::read_to_string(&other).unwrap(), r#"{"theme":"dark"}"#);
    }

    #[test]
    fn creates_one_missing_folder_but_not_a_tree() {
        let dir = scratch();
        save_locker_file(&dir.join("seQRets").join("L.json"), &locker("abc", 1), None).unwrap();
        assert!(dir.join("seQRets").join("L.json").is_file());
        assert!(save_locker_file(&dir.join("a").join("b").join("L.json"), &locker("abc", 1), None).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn refuses_a_symlinked_target() {
        let dir = scratch();
        let real = dir.join("real.json");
        fs::write(&real, locker("abc", 1)).unwrap();
        let link = dir.join("link.json");
        std::os::unix::fs::symlink(&real, &link).unwrap();
        assert!(save_locker_file(&link, &locker("abc", 2), Some(1)).is_err());
        assert_eq!(fs::read_to_string(&real).unwrap(), locker("abc", 1));
    }

    #[test]
    fn finds_macos_cloud_folders() {
        let home = scratch();
        for d in [
            "Library/Mobile Documents/com~apple~CloudDocs",
            "Library/CloudStorage/GoogleDrive-sam@example.com/My Drive",
            "Library/CloudStorage/Dropbox",
            "Library/CloudStorage/OneDrive-Personal",
        ] {
            fs::create_dir_all(home.join(d)).unwrap();
        }
        let found = detect_macos(&home);
        let summary: Vec<(String, Option<String>)> = found.iter().map(|f| (f.provider.clone(), f.account.clone())).collect();
        assert_eq!(summary, vec![
            ("iCloud Drive".into(), None),
            ("Google Drive".into(), Some("sam@example.com".into())),
            ("Dropbox".into(), None),
            ("OneDrive".into(), Some("Personal".into())),
        ]);
        assert!(found[1].path.ends_with("My Drive"));
    }

    #[test]
    fn finds_nothing_on_an_empty_mac() {
        assert!(detect_macos(&scratch()).is_empty());
    }

    #[test]
    fn finds_windows_cloud_folders() {
        let home = scratch();
        let appdata = scratch();
        let g = scratch();
        fs::create_dir_all(home.join("iCloudDrive")).unwrap();
        fs::create_dir_all(g.join("My Drive")).unwrap();
        let dropbox = home.join("Dropbox (Personal)");
        fs::create_dir_all(&dropbox).unwrap();
        fs::create_dir_all(appdata.join("Dropbox")).unwrap();
        fs::write(
            appdata.join("Dropbox").join("info.json"),
            serde_json::json!({ "personal": { "path": dropbox.to_string_lossy() } }).to_string(),
        )
        .unwrap();
        let onedrive = home.join("OneDrive");
        fs::create_dir_all(&onedrive).unwrap();
        let env = |k: &str| match k {
            "APPDATA" => Some(appdata.to_string_lossy().into_owned()),
            "OneDrive" => Some(onedrive.to_string_lossy().into_owned()),
            _ => None,
        };
        let found = detect_windows(&home, &env, &[g.clone(), scratch()]);
        let providers: Vec<&str> = found.iter().map(|f| f.provider.as_str()).collect();
        assert_eq!(providers, vec!["iCloud Drive", "Google Drive", "Dropbox", "OneDrive"]);
        assert_eq!(found[2].path, dropbox.to_string_lossy());
    }
}

#[cfg(test)]
mod this_computer {
    /// Manual check: `cargo test print_this_computers_cloud_folders -- --ignored --nocapture`
    #[test]
    #[ignore]
    fn print_this_computers_cloud_folders() {
        println!("{:#?}", super::cloud_folders());
    }
}
