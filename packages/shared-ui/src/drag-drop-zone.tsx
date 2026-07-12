'use client';

import { useState, useRef, DragEvent, useCallback, ReactNode } from 'react';
import { cn } from './utils';
import { FileUp } from 'lucide-react';

interface DragDropZoneProps {
  /** Called when files are dropped or selected */
  onFiles: (files: File[]) => void;
  /** Whether to accept multiple files (default: false) */
  multiple?: boolean;
  /** File accept attribute (e.g. "image/*", ".bin,.key") */
  accept?: string;
  /** Primary text inside the drop zone */
  label: string;
  /** Secondary text (e.g. "or click to select a file") */
  hint?: string;
  /** Icon to display (defaults to FileUp) */
  icon?: ReactNode;
  /** Icon size class (defaults to "w-10 h-10") */
  iconClassName?: string;
  /** Padding class (defaults to "p-6") */
  paddingClassName?: string;
  /** aria-label for the hidden file input */
  inputAriaLabel?: string;
  /** Extra content rendered inside the zone (e.g. an alternate-source button).
   *  Interactive children must call e.stopPropagation() in their onClick so
   *  they don't also open the file dialog. */
  children?: ReactNode;
}

export function DragDropZone({
  onFiles,
  multiple = false,
  accept,
  label,
  hint,
  icon,
  iconClassName = 'w-10 h-10',
  paddingClassName = 'p-6',
  inputAriaLabel,
  children,
}: DragDropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [onFiles, multiple]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFiles(multiple ? files : [files[0]]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [onFiles, multiple]);

  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={cn(
        'group relative flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out',
        paddingClassName,
        isDragging
          ? 'bg-[#cbc5ba] border-black dark:bg-black dark:border-primary/60'
          : 'bg-muted border-muted-foreground/40 hover:bg-[#cbc5ba] hover:border-black dark:border-primary/60 dark:hover:bg-black dark:hover:border-primary/60'
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={openFileDialog}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openFileDialog();
        }
      }}
    >
      {icon ?? <FileUp className={cn(iconClassName, 'text-muted-foreground mb-3')} />}
      <p className="text-base font-medium">{label}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      <input
        ref={fileInputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        onChange={handleFileSelect}
        aria-label={inputAriaLabel}
      />
      {children}
    </div>
  );
}
