"use client";

import React, { useState } from "react";
import { ImageOff, FileIcon, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Attachment } from "@/types/openai";

interface MediaPreviewProps {
  attachment: Attachment;
  className?: string;
}

// Helper to detect attachment type
function getAttachmentType(attachment: Attachment): 'image' | 'video' | 'audio' | 'file' {
  if ('image_url' in attachment) return 'image';
  if ('video_url' in attachment) return 'video';
  if ('input_audio' in attachment) return 'audio';
  return 'file';
}

// Helper to get URL/data from attachment
function getAttachmentSrc(attachment: Attachment): string | undefined {
  if ('image_url' in attachment) return attachment.image_url.url;
  if ('video_url' in attachment) return attachment.video_url.url;
  if ('input_audio' in attachment) return attachment.input_audio.data;
  if ('file' in attachment) return attachment.file.fileData;
  return undefined;
}

// Helper to get filename for file attachments
function getFilename(attachment: Attachment): string {
  if ('file' in attachment) return attachment.file.filename;
  return 'file';
}

export default function MediaPreview({ attachment, className }: MediaPreviewProps) {
  const [hasError, setHasError] = useState(false);
  const type = getAttachmentType(attachment);
  const src = getAttachmentSrc(attachment);

  const placeholderClass = `inline-flex mt-4 mb-4 w-30 h-30 aspect-square rounded-md bg-secondary items-center justify-center ${className || ""}`;

  if (!src) {
    return (
      <span className={placeholderClass}>
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );
  }

  if (hasError) {
    return (
      <span className={placeholderClass}>
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );
  }

  // Image preview with fullscreen dialog
  if (type === 'image') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="border-none bg-transparent p-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="attachment"
              onError={() => setHasError(true)}
              className={`max-w-96 max-h-96 rounded-md mt-4 mb-4 cursor-pointer ${className || ""}`}
            />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-0 overflow-hidden">
          <DialogTitle className="sr-only">Image preview</DialogTitle>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="attachment" className="w-full h-full object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    );
  }

  // Video preview with fullscreen dialog
  if (type === 'video') {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="border-none bg-transparent p-0">
            <video
              src={src}
              onError={() => setHasError(true)}
              className={`max-w-96 max-h-96 rounded-md mt-4 mb-4 cursor-pointer ${className || ""}`}
              muted
            />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] max-h-[90vh] p-4 overflow-hidden">
          <DialogTitle className="sr-only">Video preview</DialogTitle>
          <video src={src} controls className="w-full h-full object-contain rounded-lg" />
        </DialogContent>
      </Dialog>
    );
  }

  // Audio preview
  if (type === 'audio') {
    return (
      <div className={`inline-flex items-center gap-2 mt-4 mb-4 p-3 rounded-md bg-secondary ${className || ""}`}>
        <Volume2 className="size-5 text-muted-foreground" />
        <audio src={src} controls className="h-8" onError={() => setHasError(true)} />
      </div>
    );
  }

  // File preview (generic)
  const filename = getFilename(attachment);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="border-none bg-transparent p-0">
          <div className={`inline-flex items-center gap-2 mt-4 mb-4 p-3 rounded-md bg-secondary cursor-pointer hover:bg-secondary/80 ${className || ""}`}>
            <FileIcon className="size-5 text-muted-foreground" />
            <span className="text-sm truncate max-w-40">{filename}</span>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-4">
        <DialogTitle>{filename}</DialogTitle>
        <div className="flex flex-col items-center gap-4">
          <FileIcon className="size-16 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">File preview not available</p>
          {src && (
            <a
              href={src}
              download={filename}
              className="text-sm text-primary underline"
            >
              Download file
            </a>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
