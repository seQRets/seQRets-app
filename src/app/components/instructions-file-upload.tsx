
'use client';

import { useCallback } from 'react';
import { FileText, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { DragDropZone } from './drag-drop-zone';

interface InstructionsFileUploadProps {
  onFileSelected: (file: File | null) => void;
  selectedFile: File | null;
}

export function InstructionsFileUpload({ onFileSelected, selectedFile }: InstructionsFileUploadProps) {
  const { toast } = useToast();

  const handleFiles = useCallback((files: File[]) => {
    const file = files[0];
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
            variant: 'destructive',
            title: 'File Too Large',
            description: 'The instructions file size cannot exceed 5MB.',
        });
        onFileSelected(null);
        return;
    }
    onFileSelected(file);
    toast({
      title: 'Instructions File Selected',
      description: `${file.name} has been loaded and is ready for encryption.`,
    });
  }, [onFileSelected, toast]);

  const handleRemoveFile = () => {
    onFileSelected(null);
    toast({
        title: 'Instructions File Removed',
        description: `The instructions file has been cleared.`,
    });
  };

  if (selectedFile) {
    return (
        <div className="flex items-center justify-between w-full p-3 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">Instructions loaded successfully.</span>
                </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleRemoveFile} className="h-8 w-8 flex-shrink-0">
                <X className="h-5 w-5" />
                <span className="sr-only">Remove instructions file</span>
            </Button>
        </div>
    );
  }

  return (
    <DragDropZone
      onFiles={handleFiles}
      accept=".txt,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      label="Drag & drop your instructions file here"
      hint="or click to select a file (5MB limit)"
    />
  );
}
