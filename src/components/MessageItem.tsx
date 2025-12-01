"use client";

import React from "react";
import { Item, ItemContent } from "./ui/item";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Pencil, RefreshCw, Trash2, Check, X, Paperclip } from "lucide-react";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible";
import ReactMarkdown from "react-markdown";
import MarkdownRenderer from "./MarkdownRenderer";
import MediaPreview from "./MediaPreview";
import AttachmentThumbnail from "./AttachmentThumbnail";
import type { Message } from "@/types/openai";

interface MessageItemProps {
  msg: Message;
  idx: number;
  isStreaming: boolean;
  isEditing: boolean;
  editingMessage: Message | null;
  onEdit: (idx: number) => void;
  onEditSave: () => void;
  onEditCancel: () => void;
  onEditChange: (content: string) => void;
  onEditAddAttachment: () => void;
  onEditRemoveAttachment: (imgIdx: number) => void;
  onRegenerate: (idx: number) => void;
  onDelete: (idx: number) => void;
}

export default function MessageItem({
  msg,
  idx,
  isStreaming,
  isEditing,
  editingMessage,
  onEdit,
  onEditSave,
  onEditCancel,
  onEditChange,
  onEditAddAttachment,
  onEditRemoveAttachment,
  onRegenerate,
  onDelete,
}: MessageItemProps) {
  const isContentEmpty = () => {
    if (!msg.content) return true;
    if (typeof msg.content === "string") return msg.content.trim() === "";
    return (
      !msg.content.some((c) => c.type === "text" && c.text?.trim()) &&
      !msg.content.some((c) => c.type === "image_url")
    );
  };

  return (
    <Item
      className={`group flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <ItemContent
        className={`relative p-4 rounded-2xl max-w-[85%] ${msg.role === "user" ? "bg-secondary" : "bg-muted"}`}
      >
        {/* Reasoning Section - hidden when editing */}
        {!isEditing && msg.reasoning && msg.reasoning.length > 0 && (
          <Collapsible defaultOpen={!isStreaming}>
            <CollapsibleTrigger className="w-full text-left text-sm text-muted-foreground underline mb-2">
              <div className="flex items-center justify-between">
                <span>
                  {isContentEmpty() && (!msg.images || msg.images.length === 0)
                    ? msg.reasoning.trim().split("\n").slice(-1)[0]
                    : "Show Reasoning"}
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mb-2">
              <ReactMarkdown>{msg.reasoning}</ReactMarkdown>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Edit Mode */}
        {isEditing && editingMessage ? (
          <div className="flex flex-col gap-2 w-full">
            <Textarea
              value={
                typeof editingMessage.content === "string"
                  ? editingMessage.content
                  : ""
              }
              onChange={(e) => onEditChange(e.target.value)}
              className="min-h-[100px] field-sizing-content resize-none bg-transparent border-0 p-0 focus-visible:ring-0"
              autoFocus
            />
            {editingMessage.images && editingMessage.images.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {editingMessage.images.map((attachment, imgIdx) => (
                  <AttachmentThumbnail
                    key={imgIdx}
                    attachment={attachment}
                    onRemove={() => onEditRemoveAttachment(imgIdx)}
                  />
                ))}
              </div>
            )}
            <div className="flex gap-1 justify-between">
              <Button size="sm" variant="outline" onClick={onEditAddAttachment} disabled={isStreaming}>
                <Paperclip className="h-3 w-3 mr-1" /> Add Attachment
              </Button>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={onEditCancel} disabled={isStreaming}>
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
                <Button size="sm" onClick={onEditSave} disabled={isStreaming}>
                  <Check className="h-3 w-3 mr-1" /> Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Message Content */}
            {msg.content &&
              (typeof msg.content === "string" ? (
                <MarkdownRenderer content={msg.content} />
              ) : (
                <>
                  {(() => {
                    const textPart = msg.content.find((c) => c.type === "text");
                    return textPart?.text ? (
                      <MarkdownRenderer content={textPart.text} />
                    ) : null;
                  })()}
                  {msg.content
                    .filter((c) => c.type === "image_url")
                    .map((c, i) =>
                      c.image_url?.url ? (
                        <MediaPreview
                          key={i}
                          attachment={{ image_url: { url: c.image_url.url } }}
                        />
                      ) : null
                    )}
                </>
              ))}

            {/* Attached Images */}
            {msg.images && Array.isArray(msg.images) && (
              <div className="flex flex-wrap gap-2">
                {msg.images.map((attachment, i) => (
                  <MediaPreview key={i} attachment={attachment} />
                ))}
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        {!isEditing && (
          <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex gap-0.5 bg-inherit rounded">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onEdit(idx)}
              disabled={isStreaming}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onRegenerate(idx)}
              disabled={isStreaming}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => onDelete(idx)}
              disabled={isStreaming}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </ItemContent>
    </Item>
  );
}
