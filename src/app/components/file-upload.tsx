
'use client';

import { useRef } from 'react';
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
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4">
        {/* Desktop: drag & drop zone */}
        <div className="hidden sm:block">
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
        </div>
        {/* Mobile: browse button */}
        <div className="sm:hidden">
          <Button
            variant="outline"
            onClick={() => mobileFileInputRef.current?.click()}
            className="w-full h-12 text-sm dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black"
          >
            <FileUp className="mr-2 h-5 w-5 shrink-0" />
            Browse QR Images
          </Button>
          <input
            ref={mobileFileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length > 0) {
                onFilesAdded(files);
                if (mobileFileInputRef.current) mobileFileInputRef.current.value = '';
              }
            }}
            aria-label="Upload QR code images"
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">or use another method:</p>
        <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={onManualOpen} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <TextCursorInput className="hidden sm:inline sm:mr-1.5 h-4 w-4 shrink-0" />
                Paste Text
            </Button>
            <Button variant="outline" onClick={onCameraOpen} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                <Camera className="hidden sm:inline sm:mr-1.5 h-4 w-4 shrink-0" />
                Scan QR
            </Button>
            {onImportVault && (
              <Button variant="outline" onClick={onImportVault} className="w-full text-sm px-2 dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black">
                  <FolderOpen className="hidden sm:inline sm:mr-1.5 h-4 w-4 shrink-0" />
                  <span className="sm:hidden">Vault</span>
                  <span className="hidden sm:inline">Import Vault</span>
              </Button>
            )}
        </div>
    </div>
  );
}
