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
import { chatStore, chatsStore } from "@/lib/store";
import { Item, ItemContent } from "./ui/item";
import ReactMarkdown from "react-markdown";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible";
import { toast } from "sonner";

import MarkdownRenderer from "./MarkdownRenderer";
import ImageWithPlaceholder from "./ImageWithPlaceholder";
import { Spinner } from "./ui/spinner";

type ContentPart = { type: "text" | "image_url"; text?: string; image_url?: { url: string }; }
type MessageContent = string | ContentPart[]

interface Message {
  role?: "user" | "assistant";
  content?: MessageContent;
  reasoning?: string;
  images?: Array<{ image_url?: { url?: string } }>;
}
export default function MiddlePanel() {
  const [input, setInput] = useState<{ text: string; images: ContentPart[] }>({ text: "", images: [] });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const currentChatId = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getSnapshot,
    chatStore.getServerSnapshot
  );
  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    if (currentChatId && currentChatId > 0) {
      fetch(`/api/chats/${currentChatId}`)
        .then((res) => res.json())
        .then((chat: { content: Message[] }) => {
          setMessages(chat.content);
        })
        .catch((err) => {
          console.error("Failed to fetch chat", err);
          toast.error("Failed to load chat messages");
        });
    } else {
      setTimeout(() => setMessages([]), 0);
    }
  }, [currentChatId]);

  async function* parseStream(reader: ReadableStreamDefaultReader<Uint8Array>) {
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value);
      const lines = buffer.split("\n");
      buffer = lines.pop() || ""; // Keep incomplete line
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const data = JSON.parse(trimmed);
          if (data.error) {
            console.error("Stream error:", data.error);
            toast.error(`Error: ${data.error.message || data.error}`);
            continue;
          }
          if (!data.choices?.[0]?.delta) continue;
          yield data.choices[0].delta;
        } catch (e) {
          console.error("Failed to parse chunk:", e, trimmed.slice(0, 200));
          toast.error("Failed to parse response chunk");
        }
      }
    }
  }

  const handleSend = async () => {
    if (isStreaming || (!input.text.trim() && input.images.length === 0) || currentChatId == null) return;

    const userContent = input.text.trim() ? [{ type: "text" as const, text: input.text }, ...input.images] : input.images;

    setMessages((prev) => {
      const next = [...prev, { role: 'user' as const, content: userContent }];
      messagesRef.current = next;
      return next;
    });
    setInput({ text: "", images: [] });

    let activeChatId = currentChatId;
    if (messagesRef.current.length === 1 && currentChatId && currentChatId < 0) {
      try {
        const createResp = await fetch(`/api/chats/new`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messagesRef.current),
        });
        if (createResp.ok) {
          const newChat = await createResp.json();
          // replace ephemeral chat in global chatsStore with the persisted chat
          chatsStore.set(chatsStore.getSnapshot().map(c => (c.id === currentChatId ? newChat : c)));
          // update store and use new id for subsequent requests
          activeChatId = newChat.id;
          chatStore.set(newChat.id);
        } else {
          console.error('Failed to create chat before sending message', await createResp.text());
          toast.error('Failed to create chat');
          return;
        }
      } catch (err) {
        console.error('Error creating chat before sending message', err);
        toast.error('Failed to create chat');
        return;
      }
    }

    if (messagesRef.current.length === 1) {
      fetch(`/api/chats/${activeChatId}/title`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.text }),
      }).then(titleResponse => {
        if (titleResponse.ok) {
          titleResponse.json().then(({ name }) => {
            chatsStore.set(chatsStore.getSnapshot().map(c => (c.id === activeChatId ? { ...c, name } : c)));
          });
        } else {
          console.warn('Title generation endpoint returned non-OK', titleResponse.text());
        }
      }).catch(err => {
        console.error('Failed to generate title', err);
      });
    }

    // show a typing indicator separate from messages
    setShowTypingIndicator(true);
    setIsStreaming(true);

    try {
      const response = await fetch(`/api/chats/${activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesRef.current,
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      if (!response.body) throw new Error('Response has no body');
      const reader = response.body.getReader();
      let assistantMessage: Message | null = null;
      let localMessages: Message[] = messagesRef.current.slice();

      for await (const delta of parseStream(reader)) {
        if (!assistantMessage) {
          // first chunk: create assistant message and append
          assistantMessage = { role: 'assistant' };
          localMessages = [...messagesRef.current, assistantMessage];
          setMessages(localMessages);
          messagesRef.current = localMessages;
          // hide typing indicator once we append the actual assistant message
          setShowTypingIndicator(false);
        }

        if (delta.content) {
          assistantMessage.content = (assistantMessage.content || '') + delta.content;
        }
        if (delta.reasoning) {
          // keep reasoning under the reasoning field so Collapsible works
          assistantMessage.reasoning = (assistantMessage.reasoning || '') + delta.reasoning;
        }
        // delta.reasoning_details to prevent receiving duplicate images from gemini responses
        if (delta.images && Array.isArray(delta.images) && delta.reasoning_details && Array.isArray(delta.reasoning_details) && delta.reasoning_details.length === 0) {
          assistantMessage.images = (assistantMessage.images || []).concat(delta.images);
        }

        // update the last message in place (immutably)
        if (assistantMessage) {
          const msgToWrite: Message = assistantMessage;
          setMessages(prev => {
            const next = prev.slice();
            next[next.length - 1] = msgToWrite;
            messagesRef.current = next;
            return next;
          });
        }
      }

      // ensure typing indicator is hidden when stream completes
      setShowTypingIndicator(false);
      setIsStreaming(false);

      await fetch(`/api/chats/${activeChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: localMessages }),
      });
    } catch (error) {
      console.error("Send failed:", error);
      // hide typing indicator; keep messages intact
      setShowTypingIndicator(false);
      toast.error("Failed to send message");
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
        setInput(prev => ({ ...prev, images: [...prev.images, { type: "image_url", image_url: { url: result } }] }));
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
                    {(() => {
                      const isContentEmpty = !msg.content || (typeof msg.content === 'string' ? msg.content.trim() === "" : !msg.content.some(c => c.type === "text" && c.text?.trim()) && !msg.content.some(c => c.type === "image_url"));
                      return isContentEmpty && (!msg.images || msg.images.length === 0) ?
                        msg.reasoning.trim().split("\n").slice(-1)[0]
                        :
                        "Show Reasoning";
                    })()}
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
          <Item key="typing-indicator">
            <ItemContent className="p-4 border rounded-md border-border">
              <div className="flex items-center gap-2">
                <Spinner className="size-4" />
                <span className="text-muted-foreground">Assistant is thinking...</span>
              </div>
            </ItemContent>
          </Item>
        )}
        {/* Spacer so the chat can be scrolled past the bottom and input doesn't overlap the last message */}
        <div className="h-36 md:h-40" />
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-linear-to-t from-background via-background/50 to-transparent">
        <InputGroup className="shadow-none bg-background">
          <InputGroupInput
            value={input.text}
            onChange={(e) => setInput(prev => ({ ...prev, text: e.target.value }))}
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
        {input.images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {input.images.map((img, idx) => (
              img.image_url?.url ? (
                <div key={idx} className="relative">
                  <Image src={img.image_url.url} alt="" width={100} height={100} className="rounded" unoptimized />
                  <button onClick={() => setInput(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button>
                </div>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div >
  );
}
