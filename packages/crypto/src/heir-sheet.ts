// ── Heir sheets and the password letter ─────────────────────────────
// The words printed on each family member's heir sheet and on the blank
// password letter. Pure text (the desktop app lays it out as a PDF), kept
// here so `npm test` can hold the rules:
//   - a sheet opens nothing on its own;
//   - it never names the other people who hold Qards and never says where
//     any Qard is;
//   - it never contains a password, seed, PIN, Qard or the Locker's key.
// Everything a sheet says comes from the arguments below, none of which
// holds a secret.

import type { HeirSheetRecipient, HeirSheets } from './locker';

/** Free, offline recovery tool for when seQRets itself is gone. */
export const RECOVER_HOSTED_URL = 'https://seqrets.github.io/seQRets-Recover/';
export const RECOVER_DOWNLOAD_URL = 'https://github.com/seQRets/seQRets-Recover/releases/latest';
export const SEQRETS_SITE = 'seqrets.app';

export interface PrintedBlock {
    heading: string;
    /** Plain paragraphs, or list items when `list` is set. */
    items: string[];
    list?: 'numbered' | 'bulleted';
}

export interface PrintedPage {
    title: string;
    subtitle: string;
    blocks: PrintedBlock[];
}

export interface HeirSheetArgs {
    recipient: HeirSheetRecipient;
    sheets: Pick<HeirSheets, 'lockerLocation' | 'passwordLetterLocation'>;
    /** "Prepared by" from the plan; '' when not given. */
    ownerName: string;
    requiredShares: number;
    totalShares: number;
    /** The Locker file's name, e.g. seQRets-Locker-c6DrIxFm.json. */
    lockerFileName: string;
    keyfileUsed: boolean;
    /** Date printed on the sheet (YYYY-MM-DD). */
    date: string;
}

function qardsNeeded(required: number, total: number): string {
    if (required >= total) return total === 1 ? 'The Qard' : `All ${total} Qards`;
    return `Any ${required} of the ${total} Qards`;
}

export function heirSheetPage(args: HeirSheetArgs): PrintedPage {
    const { recipient, sheets, requiredShares, totalShares, lockerFileName, keyfileUsed } = args;
    const owner = args.ownerName.trim();
    const name = recipient.name.trim();
    const who = owner || 'Someone close to you';

    const yourQard = recipient.qardNumber
        ? [
            `You hold Qard #${recipient.qardNumber}. Keep it somewhere safe, and keep this page in a different place.`,
        ]
        : ['You don\'t hold a Qard. The people who do will bring theirs when the time comes.'];

    const needed = [
        `${qardsNeeded(requiredShares, totalShares)}.`,
        'The password letter.',
        'The Locker file.',
    ];
    if (keyfileUsed) needed.push('The keyfile. The password letter says where it is.');

    const lockerWhere = sheets.lockerLocation.trim() || 'Not written down.';
    const letterWhere = sheets.passwordLetterLocation.trim() || 'Not written down.';

    return {
        title: name ? `Heir Sheet for ${name}` : 'Heir Sheet',
        subtitle: [owner ? `From ${owner}` : '', args.date].filter(Boolean).join(' · '),
        blocks: [
            {
                heading: 'What this is',
                items: [
                    `${who} used seQRets to leave you a Locker: one encrypted file holding their accounts, wallets and wishes for the family. This page tells you how to open it. It opens nothing on its own.`,
                ],
            },
            { heading: 'Your Qard', items: yourQard },
            { heading: 'What you need', items: needed, list: 'bulleted' },
            {
                heading: 'Where things are',
                items: [
                    `The Locker file: ${lockerWhere} Its name is ${lockerFileName}.`,
                    `The password letter: ${letterWhere}`,
                ],
                list: 'bulleted',
            },
            {
                heading: 'How to open the Locker',
                items: [
                    `Install the free seQRets app on a computer, from ${SEQRETS_SITE}.`,
                    'Open seQRets, go to the Locker tab and choose "Open a Locker".',
                    'Choose the Locker file, add the Qards, and type the password from the letter.',
                    'When the Locker opens, start with "Next Steps for Your Family".',
                ],
                list: 'numbered',
            },
            {
                heading: 'If seQRets is no longer around',
                items: [
                    `Use seQRets Recover, a free tool that works offline in a web browser: ${RECOVER_HOSTED_URL} (or download it from ${RECOVER_DOWNLOAD_URL}).`,
                    'Restore the Qards with the password. Recover shows a long code that starts with "seQRets-Locker-Key:". Then open the Locker file in Recover and use that whole code as its password.',
                ],
            },
            {
                heading: 'Stay safe',
                items: [
                    'No one from seQRets will ever contact you or ask for your Qard, the password or this page.',
                    'Don\'t rush, and be wary of anyone who offers to open the Locker for you.',
                    'Keep this page apart from your Qard.',
                ],
                list: 'bulleted',
            },
        ],
    };
}

export interface PasswordLetterField {
    label: string;
    /** Ruled lines to write on. */
    lines: number;
}

export interface PasswordLetterPage extends PrintedPage {
    fields: PasswordLetterField[];
    closing: string[];
}

/** The blank password letter: filled in by hand, never by the app. */
export function passwordLetterPage(args: { lockerFileName: string; keyfileUsed: boolean }): PasswordLetterPage {
    const fields: PasswordLetterField[] = [{ label: 'Password', lines: 3 }];
    if (args.keyfileUsed) fields.push({ label: 'Where the keyfile is', lines: 2 });
    fields.push({ label: 'Smart card PINs, if you use smart cards', lines: 2 });
    return {
        title: 'Password Letter',
        subtitle: `For the Locker file ${args.lockerFileName}`,
        blocks: [
            {
                heading: 'How to use this letter',
                items: [
                    'Write the password below by hand. Don\'t type it into a computer to print it.',
                    'Seal this page in an envelope, write "seQRets password letter" on the outside, and give it to your attorney or keep it in a safe.',
                    'The password opens nothing on its own: the Qards are needed too.',
                ],
                list: 'bulleted',
            },
        ],
        fields,
        closing: ['If you change the password, write a new letter and destroy this one.'],
    };
}

/** Suggested file name for the heir sheets PDF. */
export function heirSheetsPdfFileName(setId: string): string {
    return `seQRets-Heir-Sheets-${setId.replace(/[^A-Za-z0-9_-]/g, '')}.pdf`;
}
