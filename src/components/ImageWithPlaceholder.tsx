"use client";

import React, { useState } from "react";
import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface ImageWithPlaceholderProps extends React.ComponentProps<"img"> {
  className?: string;
}

export default function ImageWithPlaceholder({
  src,
  alt,
  className,
  ...rest
}: ImageWithPlaceholderProps) {
  const [hasError, setHasError] = useState(false);

  const placeholderClass = `inline-flex mt-4 mb-4 w-30 h-30 aspect-square rounded-md bg-secondary items-center justify-center ${className || ""}`;

  if (!src)
    return (
      <span className={placeholderClass}>
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );

  return hasError ? (
    <span className={placeholderClass}>
      <ImageOff className="size-4 text-muted-foreground" />
    </span>
  ) : (
    <Dialog>
      <DialogTrigger asChild>
        <button className="border-none bg-transparent p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            {...rest}
            onError={() => setHasError(true)}
            className={`max-w-96 max-h-96 rounded-md mt-4 mb-4 cursor-pointer ${className || ""}`}
          />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-[90vw] max-h-[90vh] p-0">
        <DialogTitle className="sr-only">{alt || "Image"}</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      </DialogContent>
    </Dialog>
  );
}