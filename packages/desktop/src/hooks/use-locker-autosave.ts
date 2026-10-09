import { useCallback, useEffect, useRef, useState } from 'react';
import { saveLocker } from '@seqrets/crypto';
import { desktopLockerCrypto } from '@/lib/locker';
import type { OpenLocker } from '@/lib/locker';
import { LockerSaveError, writeLockerFile } from '@/lib/locker-files';

/** Quiet time after the last edit before the Locker saves itself. */
export const AUTOSAVE_DELAY_MS = 2000;

export type AutosaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  /** The save failed (disk, network drive…); edits are kept and retried. */
  | { kind: 'error'; message: string }
  /** The file changed elsewhere or is gone: saving stops until the owner decides. */
  | { kind: 'conflict'; message: string };

type LockerUpdate = (update: (prev: OpenLocker) => OpenLocker) => void;

/**
 * Saves an open Locker back to its file a moment after each edit.
 *
 * Every save seals the Locker as the next version and writes it through the
 * safe Rust command with the version it replaces, so a file changed
 * somewhere else (another computer) is never overwritten — that stops
 * automatic saving with a 'conflict' status instead. Saves run one at a
 * time; an edit made during a save triggers another save after it.
 */
export function useLockerAutosave(args: {
  locker: OpenLocker;
  update: LockerUpdate;
  setDirty: (dirty: boolean) => void;
  /** Called after the first successful automatic save of this session. */
  onFirstSave?: () => void;
}) {
  const { locker, update, setDirty, onFirstSave } = args;
  const [status, setStatus] = useState<AutosaveStatus>({ kind: 'idle' });

  // Latest values for async code; the seq is advanced here as soon as a
  // save lands so a follow-up save never reuses an old version number.
  const lockerRef = useRef(locker);
  lockerRef.current = { ...locker, seq: Math.max(locker.seq, lockerRef.current?.seq ?? 0) };
  const editVersion = useRef(0);
  const savedVersion = useRef(0);
  const chain = useRef<Promise<boolean>>(Promise.resolve(true));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopped = useRef(false);
  const savedOnce = useRef(false);
  const mounted = useRef(true);
  const onFirstSaveRef = useRef(onFirstSave);
  onFirstSaveRef.current = onFirstSave;

  const doSave = useCallback(async (): Promise<boolean> => {
    const current = lockerRef.current;
    const version = editVersion.current;
    if (!current.filePath || stopped.current) return false;
    if (version === savedVersion.current) return true;
    if (mounted.current) setStatus({ kind: 'saving' });
    try {
      const saved = await saveLocker(
        { key: current.key, content: current.content, setId: current.setId, previousSeq: current.seq },
        desktopLockerCrypto,
      );
      await writeLockerFile(current.filePath, saved.text, current.seq);
      lockerRef.current = { ...lockerRef.current, seq: saved.file.seq, savedAt: saved.file.savedAt };
      savedVersion.current = version;
      if (!mounted.current) return true;
      update((prev) => ({ ...prev, seq: saved.file.seq, savedAt: saved.file.savedAt, editedOutsideApp: false }));
      if (editVersion.current === version) {
        setDirty(false);
        setStatus({ kind: 'saved', at: saved.file.savedAt });
      }
      if (!savedOnce.current) {
        savedOnce.current = true;
        onFirstSaveRef.current?.();
      }
      return true;
    } catch (e: any) {
      if (e instanceof LockerSaveError && (e.kind === 'conflict' || e.kind === 'different-set')) {
        stopped.current = true;
        if (mounted.current) setStatus({ kind: 'conflict', message: e.message });
      } else if (mounted.current) {
        setStatus({ kind: 'error', message: e?.message || String(e) });
      }
      return false;
    }
  }, [update, setDirty]);

  /** Queue a save behind any save already running. */
  const queueSave = useCallback((): Promise<boolean> => {
    chain.current = chain.current.then(doSave, doSave);
    return chain.current;
  }, [doSave]);

  /** Record an edit and save after a quiet moment. */
  const markEdited = useCallback(() => {
    editVersion.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void queueSave();
    }, AUTOSAVE_DELAY_MS);
  }, [queueSave]);

  /** Save any pending edits now (before locking, or "Try Again"). True when nothing is left unsaved. */
  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (editVersion.current === savedVersion.current) return true;
    return queueSave();
  }, [queueSave]);

  /**
   * Point automatic saving at a new file (after "Choose Where to Save"):
   * clears a stop, and treats everything up to now as saved there.
   */
  const savedElsewhere = useCallback((at: string) => {
    stopped.current = false;
    savedVersion.current = editVersion.current;
    setStatus({ kind: 'saved', at });
  }, []);

  // A pending edit still gets written if the Locker view goes away.
  const queueSaveRef = useRef(queueSave);
  queueSaveRef.current = queueSave;
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
        void queueSaveRef.current();
      }
    };
  }, []);

  return {
    status,
    markEdited,
    flush,
    savedElsewhere,
    hasUnsaved: () => editVersion.current !== savedVersion.current,
    /** The Locker as last saved/edited, including a version number that may not have rendered yet. */
    latest: () => lockerRef.current,
  };
}
