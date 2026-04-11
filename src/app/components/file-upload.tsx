
'use client';

import { Camera, FileUp, FolderOpen, TextCursorInput } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DragDropZone } from './drag-drop-zone';

interface FileUploadProps {
  onFilesAdded: (files: File[]) => void;
  onCameraOpen: () => void;
  onManualOpen: () => void;
  onImportVault?: () => void;
}

export function FileUpload({ onFilesAdded, onCameraOpen, onManualOpen, onImportVault }: FileUploadProps) {
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
        <p className="text-xs text-muted-foreground text-center">or use another method:</p>
        <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={onManualOpen} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <TextCursorInput className="mr-1.5 h-4 w-4 shrink-0" />
                Paste Text
            </Button>
            <Button variant="outline" onClick={onCameraOpen} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <Camera className="mr-1.5 h-4 w-4 shrink-0" />
                Scan QR
            </Button>
            {onImportVault && (
              <Button variant="outline" onClick={onImportVault} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                  <FolderOpen className="mr-1.5 h-4 w-4 shrink-0" />
                  Import Vault
              </Button>
            )}
        </div>
    </div>
  );
}
