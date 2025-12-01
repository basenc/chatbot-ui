"use client";

import React from "react";
import Image from "next/image";
import type { Attachment } from "@/types/openai";

interface AttachmentThumbnailProps {
  attachment: Attachment;
  onRemove?: () => void;
  size?: "sm" | "md";
}

export default function AttachmentThumbnail({
  attachment,
  onRemove,
  size = "sm",
}: AttachmentThumbnailProps) {
  const sizeClass = size === "sm" ? "w-20 h-20" : "w-24 h-24";
  const dimension = size === "sm" ? 80 : 96;

  const renderContent = () => {
    if ("image_url" in attachment && attachment.image_url?.url) {
      return (
        <Image
          src={attachment.image_url.url}
          alt=""
          width={dimension}
          height={dimension}
          className={`rounded-lg object-cover ${sizeClass} border border-border`}
          unoptimized
        />
      );
    }

    if ("video_url" in attachment && attachment.video_url?.url) {
      return (
        <video
          src={attachment.video_url.url}
          className={`rounded-lg object-cover ${sizeClass} border border-border`}
          muted
        />
      );
    }

    if ("input_audio" in attachment) {
      return (
        <div
          className={`${sizeClass} rounded-lg border border-border flex items-center justify-center bg-secondary`}
        >
          <span className="text-xs text-muted-foreground">Audio</span>
        </div>
      );
    }

    if ("file" in attachment) {
      return (
        <div
          className={`${sizeClass} rounded-lg border border-border flex items-center justify-center bg-secondary`}
        >
          <span className="text-xs text-muted-foreground truncate px-1">
            {attachment.file?.filename || "File"}
          </span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="relative group/thumbnail">
      {renderContent()}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover/thumbnail:opacity-100 transition-opacity shadow-sm"
        >
          ×
        </button>
      )}
    </div>
  );
}
