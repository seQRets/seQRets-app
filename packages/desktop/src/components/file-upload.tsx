import { Camera, CreditCard, FileUp, FolderOpen, TextCursorInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HelpHint } from '@/components/ui/help-hint';
import { DragDropZone } from '@/components/ui/drag-drop-zone';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  onCameraOpen: () => void;
  onManualOpen: () => void;
  onImportVault?: () => void;
  onSmartCardRead?: () => void;
}

export function FileUpload({ onFilesAdded, onCameraOpen, onManualOpen, onImportVault, onSmartCardRead }: FileUploadProps) {
  return (
    <div className="space-y-4">
        <DragDropZone
          onFiles={onFilesAdded}
          multiple
          accept="image/*"
          label="Drag & drop QR code images here"
          hint="or click to browse files"
          icon={<FileUp className="w-12 h-12 text-muted-foreground mb-4" />}
          paddingClassName="p-8"
          inputAriaLabel="Upload QR code images"
        />
        <div className="flex items-center justify-center gap-2">
          <p className="text-sm text-muted-foreground">or use another method:</p>
          <HelpHint label="What's the difference?">
            <p className="font-bold mb-2">Choose how to add your Qards</p>
            <p className="mt-1"><strong>Paste Text</strong> — type or paste the raw Qard text (the long <code className="text-xs">seQRets|…</code> string).</p>
            <p className="mt-2"><strong>Scan QR</strong> — open the camera and scan a physical Qard.</p>
            {onImportVault && (
              <p className="mt-2"><strong>Import Vault</strong> — load an encrypted vault file you exported earlier (all Qards in one file).</p>
            )}
            {onSmartCardRead && (
              <p className="mt-2"><strong>Smart Card</strong> — read Qards directly from a seQRets smart card (PIN-protected).</p>
            )}
          </HelpHint>
        </div>
        <div className="grid grid-cols-4 gap-2">
            <Button variant="outline" onClick={onManualOpen} className="w-full text-sm px-2 dark-thin-border bg-[#cbc5ba] hover:bg-background dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <TextCursorInput className="mr-1.5 h-4 w-4 shrink-0" />
                Paste Text
            </Button>
            <Button variant="outline" onClick={onCameraOpen} className="w-full text-sm px-2 dark-thin-border bg-[#cbc5ba] hover:bg-background dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <Camera className="mr-1.5 h-4 w-4 shrink-0" />
                Scan QR
            </Button>
            {onImportVault && (
              <Button variant="outline" onClick={onImportVault} className="w-full text-sm px-2 dark-thin-border bg-[#cbc5ba] hover:bg-background dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                  <FolderOpen className="mr-1.5 h-4 w-4 shrink-0" />
                  Import Vault
              </Button>
            )}
            {onSmartCardRead && (
              <Button variant="outline" onClick={onSmartCardRead} className="w-full text-sm px-2 dark-thin-border bg-[#cbc5ba] hover:bg-background dark:bg-[#605c53] dark:text-white dark:border-black dark:hover:bg-[#232122] dark:hover:text-white dark:hover:border-black">
                  <CreditCard className="mr-1.5 h-4 w-4 shrink-0" />
                  Smart Card
              </Button>
            )}
        </div>
    </div>
  );
}
