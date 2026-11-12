'use client';

import { UploadSimple } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import {
  FileTrigger,
  DropZone as RACDropZone,
  type DropZoneProps as RACDropZoneProps,
} from 'react-aria-components';
import { Button } from './Button';

export interface DropzoneProps extends Omit<RACDropZoneProps, 'children'> {
  title?: string;
  description?: string;
  acceptedFileTypes?: string[];
  allowsMultiple?: boolean;
  onSelectFiles?: (files: FileList | null) => void;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Dropzone({
  title = 'Drop files here or browse',
  description = 'Supports images, documents up to 10 MB',
  acceptedFileTypes,
  allowsMultiple = false,
  onSelectFiles,
  icon,
  children,
  className = '',
  ...props
}: DropzoneProps) {
  return (
    <RACDropZone
      className={`group flex flex-col items-center justify-center p-8 rounded-m border-2 border-dashed border-border bg-surface text-center transition-all duration-160 outline-none select-none cursor-pointer focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 data-[drop-target]:border-accent data-[drop-target]:bg-accent-subtle/30 ${className}`.trim()}
      {...props}
    >
      <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center text-text-2 group-data-[drop-target]:text-accent group-data-[drop-target]:bg-surface transition-colors mb-3">
        {icon || <UploadSimple size={24} weight="bold" />}
      </div>

      <div className="text-body font-semibold text-text-1">{title}</div>

      {description && <div className="text-caption text-text-3 mt-1 mb-4">{description}</div>}

      {children}

      <div className="mt-2">
        <FileTrigger
          acceptedFileTypes={acceptedFileTypes}
          allowsMultiple={allowsMultiple}
          onSelect={onSelectFiles}
        >
          <Button variant="secondary" size="sm">
            Browse files
          </Button>
        </FileTrigger>
      </div>
    </RACDropZone>
  );
}
