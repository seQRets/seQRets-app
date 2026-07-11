// Emit packages/desktop/src/components/print-fonts.ts with Inter embedded as
// base64 data: URLs (variable font — one file covers all weights).
import { readFileSync, writeFileSync } from 'fs';

const ROOT = '/Users/macuser/Documents/Dev/seQRets App';
const b64 = (f) => readFileSync(`${ROOT}/public/fonts/${f}`).toString('base64');

const latin = b64('inter-latin.woff2');
const latinExt = b64('inter-latin-ext.woff2');

const RANGE_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD';
const RANGE_LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';

const out = `// GENERATED — do not hand-edit the base64 blobs.
// Inter (variable, weights 100-900) embedded as data: URLs for the print
// document. The desktop print flow writes an HTML file to $TEMP and opens it
// in the user's default browser, which cannot reach the app's own assets —
// embedding is the only way the printed Qards keep their typeface offline
// without loading from Google Fonts (security item L2).
// Source files: public/fonts/inter-latin(.ext).woff2, fetched 2026-07-11 from
// fonts.gstatic.com (Inter v20, SIL Open Font License).
// Regenerate with: node scratchpad/gen-print-fonts.mjs (see PRELAUNCH_AUDIT L2).

export const PRINT_FONT_CSS = \`
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${latin}) format('woff2');
        unicode-range: ${RANGE_LATIN};
    }
    @font-face {
        font-family: 'Inter';
        font-style: normal;
        font-weight: 100 900;
        src: url(data:font/woff2;base64,${latinExt}) format('woff2');
        unicode-range: ${RANGE_LATIN_EXT};
    }
\`;
`;

writeFileSync(`${ROOT}/packages/desktop/src/components/print-fonts.ts`, out);
console.log(`written: ${out.length} bytes`);
