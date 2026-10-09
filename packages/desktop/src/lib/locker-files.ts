/**
 * Where Locker files live: the user's cloud-drive folders, and the safe
 * save command (Rust `locker_files.rs`) that every Locker write goes
 * through — atomic, version-checked, Locker files only.
 */
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { lockerFileName } from '@seqrets/crypto';
import { LOCKER_FILE_FILTERS } from './locker';

/** A cloud drive's synced folder on this computer. */
export interface CloudFolder {
  /** "iCloud Drive", "Google Drive", "Dropbox" or "OneDrive". */
  provider: string;
  /** Set when the client names its folder after an account. */
  account: string | null;
  path: string;
}

/** The folder created inside a cloud drive to hold Locker files. */
export const LOCKER_FOLDER_NAME = 'seQRets';

/** Shown when no cloud drive is set up (design doc wording). */
export const NO_CLOUD_NOTICE =
  'For automatic updates to your Locker, please set up connected cloud storage such as iCloud Drive, Google Drive, Dropbox or OneDrive.';

export async function findCloudFolders(): Promise<CloudFolder[]> {
  try {
    return await invoke<CloudFolder[]>('cloud_folders');
  } catch {
    return [];
  }
}

/** "iCloud Drive", or "Google Drive (sam@example.com)" when the account is known. */
export function cloudFolderLabel(folder: CloudFolder): string {
  return folder.account ? `${folder.provider} (${folder.account})` : folder.provider;
}

function separatorOf(path: string): string {
  return path.includes('\\') && !path.includes('/') ? '\\' : '/';
}

/** Full path of a Locker file in a cloud drive's seQRets folder. */
export function lockerPathIn(folder: CloudFolder, setId: string): string {
  const sep = separatorOf(folder.path);
  const base = folder.path.endsWith(sep) ? folder.path.slice(0, -1) : folder.path;
  return [base, LOCKER_FOLDER_NAME, lockerFileName(setId)].join(sep);
}

/** Last part of a path, for messages. Handles / and \. */
export function fileNameOf(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}

export type LockerSaveErrorKind = 'conflict' | 'different-set' | 'not-a-locker' | 'failed';

export class LockerSaveError extends Error {
  constructor(public kind: LockerSaveErrorKind, message: string) {
    super(message);
    this.name = 'LockerSaveError';
  }
}

const ERROR_PREFIXES: [string, LockerSaveErrorKind][] = [
  ['LOCKER_CONFLICT', 'conflict'],
  ['LOCKER_DIFFERENT_SET', 'different-set'],
  ['LOCKER_NOT_A_LOCKER', 'not-a-locker'],
];

/**
 * Write a Locker file, replacing the previous copy atomically.
 * `expectedSeq` is the version the open Locker was loaded as (null for a
 * new file or a copy); the save is refused if the file there has changed.
 */
export async function writeLockerFile(path: string, text: string, expectedSeq: number | null): Promise<void> {
  try {
    await invoke('locker_save_file', { path, contents: text, expectedSeq });
  } catch (e) {
    const raw = typeof e === 'string' ? e : (e as Error)?.message ?? String(e);
    for (const [prefix, kind] of ERROR_PREFIXES) {
      if (raw.startsWith(prefix)) {
        throw new LockerSaveError(kind, raw.slice(prefix.length).replace(/^:\s*/, ''));
      }
    }
    throw new LockerSaveError('failed', raw);
  }
}

/** Ask where to save a Locker file (native Save dialog). Null if cancelled. */
export async function chooseLockerLocation(setId: string): Promise<string | null> {
  return chooseLockerSavePath(lockerFileName(setId));
}

/** Read a Locker file at a known path (safe Rust read: Locker files only). */
export async function readLockerFile(path: string): Promise<string> {
  try {
    return await invoke<string>('locker_read_file', { path });
  } catch (e) {
    const raw = typeof e === 'string' ? e : (e as Error)?.message ?? String(e);
    throw new Error(raw.replace(/^LOCKER_NOT_A_LOCKER:\s*/, ''));
  }
}

/**
 * Ask for a Locker file with the native Open dialog, so its location is
 * known (a dropped file's isn't). Null if cancelled.
 */
export async function pickLockerFile(): Promise<{ path: string; name: string; text: string } | null> {
  const picked = await open({ multiple: false, directory: false, filters: LOCKER_FILE_FILTERS });
  const path = typeof picked === 'string' ? picked : null;
  if (!path) return null;
  return { path, name: fileNameOf(path), text: await readLockerFile(path) };
}

/** Ask where to save a Locker file, suggesting `defaultName`. Null if cancelled. */
export async function chooseLockerSavePath(defaultName: string): Promise<string | null> {
  const path = await save({ defaultPath: defaultName, filters: LOCKER_FILE_FILTERS });
  return path ?? null;
}

/**
 * Where a Locker file lives, in words: "iCloud Drive › seQRets" when it is
 * inside a cloud drive, otherwise the name of its folder.
 */
export function describeLockerLocation(path: string, folders: CloudFolder[]): { text: string; inCloud: boolean } {
  const norm = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '');
  const target = norm(path);
  for (const f of folders) {
    const root = norm(f.path);
    if (target.startsWith(root + '/')) {
      const inner = target.slice(root.length + 1).split('/').slice(0, -1);
      return { text: [cloudFolderLabel(f), ...inner].join(' › '), inCloud: true };
    }
  }
  const parts = target.split('/');
  return { text: parts.length > 1 ? parts[parts.length - 2] || target : target, inCloud: false };
}
