import { useState, useEffect, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { Download, RefreshCw, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'ready' | 'error';

interface UpdateCheckerProps {
  /** If true, check silently on mount (no dialog unless update found) */
  checkOnMount?: boolean;
  /** If true, open the dialog immediately (for manual "Check for Updates") */
  manualCheck?: boolean;
  /** Callback when dialog closes */
  onClose?: () => void;
}

export function UpdateChecker({ checkOnMount = false, manualCheck = false, onClose }: UpdateCheckerProps) {
  const [state, setState] = useState<UpdateState>('idle');
  const [open, setOpen] = useState(false);
  const [update, setUpdate] = useState<Update | null>(null);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [contentLength, setContentLength] = useState(0);

  const checkForUpdate = useCallback(async (silent: boolean) => {
    setState('checking');
    if (!silent) setOpen(true);

    try {
      const result = await check();
      if (result) {
        setUpdate(result);
        setVersion(result.version);
        setNotes(result.body ?? '');
        setState('available');
        setOpen(true);
      } else {
        setState('idle');
        if (!silent) {
          // Show "up to date" briefly for manual checks
          setState('idle');
          setOpen(true);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // Don't show errors for silent background checks
      if (!silent) {
        setError(msg);
        setState('error');
        setOpen(true);
      } else {
        setState('idle');
      }
    }
  }, []);

  const handleDownloadAndInstall = useCallback(async () => {
    if (!update) return;
    setState('downloading');
    setDownloadProgress(0);
    setContentLength(0);

    try {
      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case 'Started':
            setContentLength(event.data.contentLength ?? 0);
            break;
          case 'Progress':
            setDownloadProgress((prev) => prev + (event.data.chunkLength ?? 0));
            break;
          case 'Finished':
            break;
        }
      });
      setState('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState('error');
    }
  }, [update]);

  const handleRelaunch = useCallback(async () => {
    await relaunch();
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    onClose?.();
  }, [onClose]);

  // Auto-check on mount (silent)
  useEffect(() => {
    if (checkOnMount) {
      checkForUpdate(true);
    }
  }, [checkOnMount, checkForUpdate]);

  // Manual check trigger
  useEffect(() => {
    if (manualCheck) {
      checkForUpdate(false);
    }
  }, [manualCheck, checkForUpdate]);

  const progressPercent = contentLength > 0
    ? Math.min(100, Math.round((downloadProgress / contentLength) * 100))
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Prevent closing during download
      if (state === 'downloading') return;
      setOpen(isOpen);
      if (!isOpen) onClose?.();
    }}>
      <DialogContent className="sm:max-w-md">
        {/* Checking state */}
        {state === 'checking' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Checking for Updates
              </DialogTitle>
              <DialogDescription>
                Contacting update server...
              </DialogDescription>
            </DialogHeader>
          </>
        )}

        {/* No update available (manual check only) */}
        {state === 'idle' && open && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                You're Up to Date
              </DialogTitle>
              <DialogDescription>
                seQRets is running the latest version.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleClose}>OK</Button>
            </DialogFooter>
          </>
        )}

        {/* Update available */}
        {state === 'available' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-blue-500" />
                Update Available
              </DialogTitle>
              <DialogDescription>
                Version {version} is ready to download and install.
              </DialogDescription>
            </DialogHeader>
            {notes && (
              <div className="max-h-40 overflow-y-auto rounded-md border p-3 text-sm text-muted-foreground">
                {notes}
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Later
              </Button>
              <Button onClick={handleDownloadAndInstall}>
                <Download className="h-4 w-4 mr-2" />
                Download & Install
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Downloading */}
        {state === 'downloading' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Downloading Update
              </DialogTitle>
              <DialogDescription>
                {contentLength > 0
                  ? `${formatBytes(downloadProgress)} of ${formatBytes(contentLength)} (${progressPercent}%)`
                  : 'Downloading...'}
              </DialogDescription>
            </DialogHeader>
            {/* Progress bar */}
            <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
                style={{ width: contentLength > 0 ? `${progressPercent}%` : '100%' }}
              >
                {contentLength === 0 && (
                  <div className="h-full w-full bg-primary/50 animate-pulse" />
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Please don't close the app during the update.
            </p>
          </>
        )}

        {/* Ready to relaunch */}
        {state === 'ready' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Update Installed
              </DialogTitle>
              <DialogDescription>
                Version {version} has been installed. Restart to apply the update.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={handleRelaunch}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Restart Now
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Error */}
        {state === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Update Failed
              </DialogTitle>
              <DialogDescription>
                Could not check for updates. Please try again later.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <div className="rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
