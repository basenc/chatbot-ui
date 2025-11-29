"use client";

import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useRef,
} from "react";
import Image from "next/image";
import { ScrollArea } from "./ui/scroll-area";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
  InputGroupButton,
} from "./ui/input-group";
import { Send, Paperclip } from "lucide-react";
import { chatIDStore } from "@/lib/store";
import { Item, ItemContent } from "./ui/item";
import ReactMarkdown from "react-markdown";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible";
import { toast } from "sonner";
import { chatsCache } from "@/lib/odm";
import MarkdownRenderer from "./MarkdownRenderer";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { Spinner } from "./ui/spinner";
import { Message } from "@/types/openai";
import { chatCompletion } from "@/lib/utils";
import { trimObject } from "@/lib/utils";

export default function MiddlePanel() {
  const [input, setInput] = useState<Message>({ content: "", images: [], role: "user" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const currentChatId = useSyncExternalStore(
    chatIDStore.subscribe,
    chatIDStore.getSnapshot,
    chatIDStore.getServerSnapshot
  );
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    if (currentChatId) {
      setMessages(chatsCache.get(String(currentChatId))?.messages || []);
    } else {
      setTimeout(() => setMessages([]), 0);
    }
    setShowTypingIndicator(false);
    setIsStreaming(false);
    messagesRef.current = [];
  }, [currentChatId]);

  const handleSend = async () => {
    if (isStreaming || (!input.content && input.images?.length === 0)) return;

    if (!currentChatId) {
      toast.error("Select or create a chat first");
      return;
    }

    const chat = chatsCache.get(String(currentChatId));
    if (!chat) throw new Error(`Chat with id ${currentChatId} not found`);

    messagesRef.current = [...messagesRef.current, input];

    setMessages(messagesRef.current);
    setInput({ content: "", images: [], role: "user" });

    if (messagesRef.current.length === 1) {
      (async () => {
        const nameMessages: Message[] = [{ role: "user", content: `Generate a short, descriptive name for this chat based on the following user message: ${input.content}` }];
        const nameResponse = chatCompletion(nameMessages, true);
        let generatedName = "";
        for await (const delta of nameResponse) {
          if (delta.content) generatedName += delta.content;
        }
        chat.update({ name: generatedName.trim() });
      })();
    }

    setShowTypingIndicator(true);
    setIsStreaming(true);

    try {
      const response = chatCompletion(messagesRef.current);
      const acc: Message = {};
      messagesRef.current = [...messagesRef.current, acc];
      for await (const delta of response) {
        if (delta.content) {
          setShowTypingIndicator(false);
          acc.content = (acc.content || '') + delta.content;
        }
        if (delta.reasoning) {
          acc.reasoning = (acc.reasoning || '') + delta.reasoning;
        }
        // delta.reasoning_details to prevent receiving duplicate images from gemini responses
        if (delta.images && Array.isArray(delta.images) && delta.reasoning_details && Array.isArray(delta.reasoning_details) && delta.reasoning_details.length === 0) {
          setShowTypingIndicator(false);
          acc.images = [...(acc.images || []), ...delta.images];
        }

        setMessages([...messagesRef.current]);
      }
      console.log(trimObject(acc));

      chat.update({ messages: messagesRef.current });
    } catch (error) {
      console.error("Send failed:", error);
      toast.error("Failed to send message");
      throw error;
    } finally {
      setIsStreaming(false);
      setShowTypingIndicator(false);
    }
  };

  const addImageFromFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result && typeof result === 'string') {
        setInput(prev => ({ ...prev, images: [...(prev.images || []), { image_url: { url: result } }] }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAttach = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        addImageFromFile(file);
      }
    };
    fileInput.click();
  };

  return (
    <div className="flex flex-col h-full relative w-full">
      <ScrollArea className="min-h-0 h-full">
        {messages.map((msg, idx) => (
          <Item key={idx}>
            <ItemContent className="p-4 border rounded-md border-border">
              {msg.content && (
                typeof msg.content === 'string' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <>
                    {(() => {
                      const textPart = msg.content.find(c => c.type === "text");
                      return textPart?.text ? <MarkdownRenderer content={textPart.text} /> : null;
                    })()}
                    {msg.content.filter(c => c.type === "image_url").map((c, i) => (
                      c.image_url?.url ? (
                        <ImageWithPlaceholder
                          key={i}
                          src={c.image_url.url}
                        />
                      ) : null
                    ))}
                  </>
                )
              )}
              {msg.reasoning && msg.reasoning.length > 0 && (
                <Collapsible defaultOpen={!isStreaming}>
                  <CollapsibleTrigger className="w-full text-left text-sm text-muted-foreground underline">
                    <div className="flex items-center justify-between">
                      <span>
                        {(() => {
                          const isContentEmpty = !msg.content || (typeof msg.content === 'string' ? msg.content.trim() === "" : !msg.content.some(c => c.type === "text" && c.text?.trim()) && !msg.content.some(c => c.type === "image_url"));
                          return isContentEmpty && (!msg.images || msg.images.length === 0) ?
                            msg.reasoning.trim().split("\n").slice(-1)[0]
                            :
                            "Show Reasoning";
                        })()}
                      </span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ReactMarkdown>
                      {msg.reasoning}
                    </ReactMarkdown>
                  </CollapsibleContent>
                </Collapsible>
              )}
              {msg.images && Array.isArray(msg.images) &&
                msg.images.map(
                  (img, i) =>
                    img.image_url?.url ? (
                      <ImageWithPlaceholder
                        key={i}
                        src={img.image_url.url}
                      />
                    ) : null
                )}
            </ItemContent>
          </Item>
        ))}
        {showTypingIndicator && (
          <Spinner className="m-8 mt-4" />
        )}
        {/* Spacer so the chat can be scrolled past the bottom and input doesn't overlap the last message */}
        <div className="h-36 md:h-40" />
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-linear-to-t from-background via-background/50 to-transparent">
        <InputGroup className="shadow-none bg-background">
          <InputGroupInput
            value={
              typeof input.content === "string" ? input.content : ""
            }
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            onPaste={(e) => {
              const items = e.clipboardData.items;
              for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                  const file = items[i].getAsFile();
                  if (file) {
                    addImageFromFile(file);
                  }
                }
              }
            }}
            className="border-t-0"
            disabled={isStreaming}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" onClick={handleAttach}>
              <Paperclip className="size-4" />
            </InputGroupButton>
            <InputGroupButton size="icon-xs" onClick={handleSend} disabled={isStreaming}>
              <Send className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        {input.images && input.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {input.images.map((img, idx) => (
              img.image_url?.url ? (
                <div key={idx} className="relative">
                  <Image src={img.image_url.url} alt="" width={100} height={100} className="rounded" unoptimized />
                  <button onClick={() => setInput(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }))} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div >
  );
}
