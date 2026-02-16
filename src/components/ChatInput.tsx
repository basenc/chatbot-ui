"use client";

import React from "react";
import { Send, Paperclip, Square } from "lucide-react";
import {
  InputGroup,
  InputGroupTextarea,
  InputGroupAddon,
  InputGroupButton,
} from "./ui/input-group";
import AttachmentThumbnail from "./AttachmentThumbnail";
import type { Message } from "@/types/openai";

interface ChatInputProps {
  input: Message;
  isStreaming: boolean;
  onInputChange: (content: string) => void;
  onSend: () => void;
  onStop: () => void;
  onAttach: () => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onRemoveAttachment: (idx: number) => void;
}

export default function ChatInput({
  input,
  isStreaming,
  onInputChange,
  onSend,
  onStop,
  onAttach,
  onPaste,
  onRemoveAttachment,
}: ChatInputProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-linear-to-t from-background via-background/50 to-transparent">
      <InputGroup className="shadow-none bg-background">
        <InputGroupTextarea
          value={typeof input.content === "string" ? input.content : ""}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            onInputChange(e.target.value)
          }
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === "Enter" && !isStreaming && onSend()}
          onPaste={onPaste}
          className="border-t-0"
          disabled={isStreaming}
          rows={2}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton size="icon-xs" onClick={onAttach} disabled={isStreaming}>
            <Paperclip className="size-4" />
          </InputGroupButton>
          {isStreaming ? (
            <InputGroupButton
              size="icon-xs"
              onClick={onStop}
              title="Stop generating"
            >
              <Square className="size-4 fill-current" />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              size="icon-xs"
              onClick={onSend}
            >
              <Send className="size-4" />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>

      {/* Attachment Previews */}
      {input.images && input.images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {input.images.map((attachment, idx) => (
            <AttachmentThumbnail
              key={idx}
              attachment={attachment}
              onRemove={() => onRemoveAttachment(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
