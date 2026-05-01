
'use client';

import { useCallback, useRef } from 'react';
import { File, FileUp, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DragDropZone } from './drag-drop-zone';
import { playFileDropSound } from '@/lib/play-sound';

interface KeyfileUploadProps {
  onFileRead: (fileContent: string | null) => void;
  onFileNameChange: (fileName: string | null) => void;
  fileName: string | null;
}

export function KeyfileUpload({ onFileRead, onFileNameChange, fileName }: KeyfileUploadProps) {
  const { toast } = useToast();
  const mobileFileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: 'The keyfile size cannot exceed 2MB.',
        });
        return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as ArrayBuffer;
      // Safe Base64 conversion for large files using chunking
      const u8 = new Uint8Array(result);
      const CHUNK_SIZE = 0x8000; // 32k
      let binary = '';
      for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
        const chunk = u8.subarray(i, i + CHUNK_SIZE);
        binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      const b64 = btoa(binary);

      onFileRead(b64);
      onFileNameChange(file.name);
      playFileDropSound();
      toast({
        title: 'Keyfile Selected',
        description: `${file.name} has been loaded.`,
      });
    };
    reader.onerror = () => {
      toast({
        variant: 'destructive',
        title: 'File Read Error',
        description: `Could not read the file ${file.name}.`,
      });
      onFileRead(null);
      onFileNameChange(null);
    };
    reader.readAsArrayBuffer(file);
  }, [onFileRead, onFileNameChange, toast]);

  const handleRemoveFile = () => {
    onFileRead(null);
    onFileNameChange(null);
    toast({
        title: 'Keyfile Removed',
        description: `The keyfile has been cleared.`,
      });
  };

  if (fileName) {
    return (
        <div className="flex items-center justify-between w-full p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
                <File className="w-6 h-6 text-primary" />
                <div className="flex flex-col">
                    <span className="text-sm font-medium">{fileName}</span>
                    <span className="text-xs text-muted-foreground">Keyfile loaded successfully.</span>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-8 w-8">
                <X className="h-5 w-5" />
                <span className="sr-only">Remove keyfile</span>
            </Button>
        </div>
    );
  }

  return (
    <>
      <div className="hidden sm:block">
        <DragDropZone
          onFiles={handleFiles}
          accept=".bin,.key"
          label="Drag & drop your keyfile here"
          hint="or click to select a file (2MB limit)"
        />
      </div>
      <div className="sm:hidden">
        <Button
          variant="outline"
          onClick={() => mobileFileInputRef.current?.click()}
          className="w-full h-12 text-sm dark-thin-border dark:bg-[#232122] dark:text-white dark:border-black dark:hover:bg-[#605c53] dark:hover:text-white dark:hover:border-black"
        >
          <FileUp className="mr-2 h-5 w-5 shrink-0" />
          Browse Keyfile
        </Button>
        <input
          ref={mobileFileInputRef}
          type="file"
          accept=".bin,.key"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) { handleFiles(files); if (mobileFileInputRef.current) mobileFileInputRef.current.value = ''; }
          }}
          aria-label="Select keyfile"
        />
      </div>
    </>
  );
}
