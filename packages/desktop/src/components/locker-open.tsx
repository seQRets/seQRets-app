import { useRef, useState } from 'react';
import { FileLock2, X } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DragDropZone } from '@/components/ui/drag-drop-zone';
import { scrollToReveal } from '@/components/ui/scroll-utils';
import { RestoreSecretForm } from '@/components/restore-secret-form';
import { LockerError, openLockerWithKey, parseLockerFile } from '@seqrets/crypto';
import type { LockerFile } from '@seqrets/crypto';
import { desktopLockerCrypto } from '@/lib/locker';
import type { OpenLocker } from '@/lib/locker';
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
  const [fileInfo, setFileInfo] = useState<LockerFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const handleFiles = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileError(null);
    try {
      const text = await file.text();
      const parsed = parseLockerFile(text);
      setFileText(text);
      setFileName(file.name);
      setFileInfo(parsed);
      playFileDropSound();
      scrollToReveal(endRef.current);
    } catch (e: any) {
      setFileText(null);
      setFileName(null);
      setFileInfo(null);
      setFileError(e instanceof LockerError ? e.message : 'This file could not be read.');
    }
  };

  const clearFile = () => {
    setFileText(null);
    setFileName(null);
    setFileInfo(null);
    setFileError(null);
  };

  const handleKeyRestored = async (key: string, setId: string | undefined) => {
    if (!fileText) throw new Error('Choose the Locker file first.');
    const unlocked = await openLockerWithKey({ fileText, key, expectedSetId: setId }, desktopLockerCrypto);
    onOpened({ ...unlocked, fileName: fileName ?? undefined });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">1</div>
          <h3 className="text-xl font-semibold">Choose the Locker File</h3>
        </div>
        <div className="pl-11 space-y-4">
          {!fileInfo ? (
            <DragDropZone
              onFiles={handleFiles}
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
                <p className="text-muted-foreground">
                  Qard set {fileInfo.setId} · saved {formatSavedAt(fileInfo.savedAt)} · version {fileInfo.seq}
                </p>
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
