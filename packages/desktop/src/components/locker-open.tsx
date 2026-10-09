import { useEffect, useRef, useState } from 'react';
import { FileLock2, Loader2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { scrollToReveal } from '@/components/ui/scroll-utils';
import { RestoreSecretForm } from '@/components/restore-secret-form';
import { LockerError, openLockerWithKey, parseLockerFile } from '@seqrets/crypto';
import type { LockerFile } from '@seqrets/crypto';
import { desktopLockerCrypto } from '@/lib/locker';
import type { OpenLocker } from '@/lib/locker';
import {
  describeLockerLocation, findCloudFolders, forgetLockerLocation, getRememberedLocker, pickLockerFile, readLockerFile, fileNameOf,
} from '@/lib/locker-files';
import { playFileDropSound } from '@/lib/play-sound';

interface LockerOpenProps {
  onOpened: (locker: OpenLocker) => void;
}

function formatSavedAt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function LockerOpen({ onOpened }: LockerOpenProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  // Known only when chosen with the file picker; a dropped file's location isn't.
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<LockerFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  // Where the file is, in words ("iCloud Drive › seQRets"), when known.
  const [whereText, setWhereText] = useState<string | null>(null);
  // The remembered location couldn't be read (moved, renamed, drive not connected).
  const [missingAt, setMissingAt] = useState<string | null>(null);
  const [loadingRemembered, setLoadingRemembered] = useState(() => !!getRememberedLocker());

  const acceptFile = (text: string, name: string, path: string | null, quiet = false) => {
    const parsed = parseLockerFile(text);
    setFileText(text);
    setFileName(name);
    setFilePath(path);
    setFileInfo(parsed);
    setMissingAt(null);
    setWhereText(null);
    if (path) {
      findCloudFolders().then((folders) => setWhereText(describeLockerLocation(path, folders).text));
    }
    if (!quiet) {
      playFileDropSound();
      scrollToReveal(endRef.current);
    }
  };

  // Go straight to the Locker file opened or saved last time, if it's still there.
  useEffect(() => {
    const remembered = getRememberedLocker();
    if (!remembered) return;
    let cancelled = false;
    (async () => {
      try {
        const text = await readLockerFile(remembered.path);
        if (!cancelled) acceptFile(text, fileNameOf(remembered.path), remembered.path, true);
      } catch {
        if (cancelled) return;
        const folders = await findCloudFolders();
        if (!cancelled) setMissingAt(describeLockerLocation(remembered.path, folders).text);
      } finally {
        if (!cancelled) setLoadingRemembered(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleForget = () => {
    forgetLockerLocation();
    setMissingAt(null);
    clearFile();
  };

  const fail = (e: any) => {
    setFileText(null);
    setFileName(null);
    setFilePath(null);
    setFileInfo(null);
    setFileError(e instanceof LockerError ? e.message : e?.message || 'This file could not be read.');
  };

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileError(null);
    try {
      acceptFile(await file.text(), file.name, null);
    } catch (e: any) {
      fail(e);
    }
  };

  const handleBrowse = async () => {
    setFileError(null);
    try {
      const picked = await pickLockerFile();
      if (picked) acceptFile(picked.text, picked.name, picked.path);
    } catch (e: any) {
      fail(e);
    }
  };

  const clearFile = () => {
    setFileText(null);
    setFileName(null);
    setFilePath(null);
    setFileInfo(null);
    setFileError(null);
    setWhereText(null);
  };

  const handleKeyRestored = async (key: string, setId: string | undefined) => {
    if (!fileText) throw new Error('Choose the Locker file first.');
    const unlocked = await openLockerWithKey({ fileText, key, expectedSetId: setId }, desktopLockerCrypto);
    onOpened({ ...unlocked, fileName: fileName ?? undefined, filePath: filePath ?? undefined });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">1</div>
          <h3 className="text-xl font-semibold">Choose the Locker File</h3>
        </div>
        <div className="pl-11 space-y-4">
          {missingAt && !fileInfo && (
            <Alert>
              <AlertTitle>Your Locker isn&apos;t where it was last time</AlertTitle>
              <AlertDescription className="space-y-2">
                <span className="block">
                  It was in {missingAt}. It may have been moved or renamed, or that drive isn&apos;t connected. Choose the Locker file below.
                </span>
                <Button variant="link" className="h-auto p-0" onClick={handleForget}>Forget this location</Button>
              </AlertDescription>
            </Alert>
          )}
          {loadingRemembered ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Finding your Locker…
            </p>
          ) : !fileInfo ? (
            <DragDropZone
              onFiles={handleFiles}
              onBrowse={handleBrowse}
              accept=".json,application/json"
              label="Drop your Locker file here"
              hint="or click to choose it (seQRets-Locker-….json)"
              icon={<FileLock2 className="w-10 h-10 text-muted-foreground" />}
              inputAriaLabel="Choose a Locker file"
            />
          ) : (
            <div className="flex items-start justify-between gap-3 rounded-md border p-4">
              <div className="space-y-1 text-sm">
                <p className="font-medium">{fileName}</p>
                {whereText && <p className="text-muted-foreground">In {whereText}</p>}
                <p className="text-muted-foreground">
                  Qard set {fileInfo.setId} · saved {formatSavedAt(fileInfo.savedAt)} · version {fileInfo.seq}
                </p>
                {filePath && filePath === getRememberedLocker()?.path && (
                  <Button variant="link" className="h-auto p-0 text-xs" onClick={handleForget}>Forget this location</Button>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile} aria-label="Choose a different file">
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {fileError && (
            <Alert variant="destructive">
              <AlertTitle>Not a Locker file</AlertTitle>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {fileInfo && (
        <div className="animate-in fade-in duration-500">
          <RestoreSecretForm lockerMode={{ onKeyRestored: handleKeyRestored }} />
        </div>
      )}
      <div ref={endRef} aria-hidden="true" />
    </div>
  );
}
