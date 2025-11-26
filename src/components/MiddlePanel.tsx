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
import { Send, Paperclip, ImageOff } from "lucide-react";
import { chatStore, chatsStore } from "@/lib/store";
import { Item, ItemContent } from "./ui/item";
import ReactMarkdown from "react-markdown";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "./ui/collapsible";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import { toast } from "sonner";
import mermaid from "mermaid";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function MermaidRenderer({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        mermaid.initialize({ startOnLoad: false, theme: "neutral" });
        if (!mounted || !ref.current) return;
        const id = "mermaid-" + Math.random().toString(36).slice(2, 9);
        try {
          const { svg } = await mermaid.render(id, chart);
          if (mounted && ref.current) ref.current.innerHTML = svg;
        } catch (e) {
          console.error("Mermaid render failed", e);
          toast.error(
            "Failed to render mermaid diagram. Displaying as plain text."
          );
          if (mounted && ref.current) ref.current.textContent = chart;
        }
      } catch (e) {
        console.error("Failed to load mermaid", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [chart]);

  return <div ref={ref} className="overflow-auto" />;
}

function ImageWithPlaceholder(props: React.ComponentProps<"img">) {
  const { src, alt, ...rest } = props;
  const [hasError, setHasError] = useState(false);

  if (!src)
    return (
      <span
        className="inline-flex mt-4 mb-4 w-30 h-30 aspect-square
        rounded-md bg-secondary items-center justify-center"
      >
        <ImageOff className="size-4 text-muted-foreground" />
      </span>
    );

  return hasError ? (
    <span
      className="inline-flex mt-4 mb-4 w-30 h-30 aspect-square rounded-md
      bg-secondary items-center justify-center"
    >
      <ImageOff className="size-4 text-muted-foreground" />
    </span>
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      {...rest}
      onError={() => setHasError(true)}
      className="max-w-96 max-h-96 rounded-md mt-4 mb-4"
    />
  );
}

interface Message {
  role?: "user" | "assistant";
  content?: string;
  reasoning?: string;
  images?: Array<{ image_url?: { url?: string } }>;
}

export default function MiddlePanel() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [settings, setSettings] = useState<{
    openai_api_base?: string;
    openai_api_key?: string;
  }>({});
  const [isStreaming, setIsStreaming] = useState(false);
  const currentChatId = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getSnapshot,
    chatStore.getServerSnapshot
  );
  const messagesRef = useRef<Message[]>(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then(setSettings)
      .catch((err) => {
        console.error("Failed to fetch settings", err);
        toast.error("Failed to load settings");
      });
  }, []);

  useEffect(() => {
    if (currentChatId) {
      fetch(`/api/chats/${currentChatId}`)
        .then((res) => res.json())
        .then((chat: { content: Array<Record<string, unknown>> }) => {
          if (chat.content && Array.isArray(chat.content)) {
            setMessages(
              chat.content.map((m) => {
                return {
                  content: m.content as string,
                  reasoning: m.reasoning as string,
                  images: m.images as Array<{ image_url?: { url?: string } }>,
                };
              })
            );
          } else {
            setMessages([]);
          }
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
    if (!input.trim() || currentChatId == null || !settings.openai_api_key) return;

    const userContent = input;

    // Add the user's message to state and ref
    setMessages((prev) => {
      const next = [...prev, { role: 'user' as const, content: input }];
      messagesRef.current = next;
      return next;
    });
    setInput("");

    let activeChatId = currentChatId as number;
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
      try {
        console.debug('Requesting generated title', { chatId: activeChatId, message: userContent });
        const titleResponse = await fetch(`/api/chats/${activeChatId}/title`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: userContent }),
        });
        if (titleResponse.ok) {
          const { name } = await titleResponse.json();
          chatsStore.set(chatsStore.getSnapshot().map(c => (c.id === activeChatId ? { ...c, name } : c)));
        } else {
          console.warn('Title generation endpoint returned non-OK', await titleResponse.text());
        }
      } catch (err) {
        console.error('Failed to generate title', err);
      }
    }

    try {
      const response = await fetch(`/api/chats/${activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: { role: "user", content: userContent },
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      const reader = response.body!.getReader();
      const assistantMessage: Message = { role: 'assistant' as const };
      const localMessages = [...messagesRef.current, assistantMessage];
      setIsStreaming(true);

      for await (const delta of parseStream(reader)) {
        if (delta.content) {
          assistantMessage.content = (assistantMessage.content || '') + delta.content;
        }
        if (delta.reasoning) {
          assistantMessage.reasoning = (assistantMessage.reasoning || '') + delta.reasoning;
        }
        if (delta.images && Array.isArray(delta.reasoning_details) && delta.reasoning_details.length === 0) {
          const images = Array.isArray(delta.images)
            ? (delta.images as Partial<{ image_url?: { url?: string } }>[])
              .filter(img => typeof img?.image_url?.url === "string")
            : [];
          assistantMessage.images = (assistantMessage.images || []).concat(images);
        }
        setMessages([...localMessages]);
        messagesRef.current = [...localMessages];
      }

      setIsStreaming(false);

      await fetch(`/api/chats/${activeChatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: localMessages }),
      });
    } catch (error) {
      console.error("Send failed:", error);
      toast.error("Failed to send message");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleAttach = () => {
    // noop for now
  };

  return (
    <div className="flex flex-col h-full relative w-full">
      <ScrollArea className="min-h-0 h-full">
        {messages.map((msg, idx) => (
          <Item key={idx}>
            <ItemContent className="p-4 border rounded-md border-border">
              {msg.content && (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
                  rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
                  components={{
                    h1: ({ ...props }) => (
                      <h1 {...props} className="text-5xl font-bold mb-2 mt-4" />
                    ),
                    h2: ({ ...props }) => (
                      <h2 {...props} className="text-4xl font-bold mb-2 mt-4" />
                    ),
                    h3: ({ ...props }) => (
                      <h3 {...props} className="text-3xl font-bold mb-2 mt-4" />
                    ),
                    h4: ({ ...props }) => (
                      <h4 {...props} className="text-2xl font-bold mb-2 mt-3" />
                    ),
                    h5: ({ ...props }) => (
                      <h5 {...props} className="text-xl font-bold mb-2 mt-2" />
                    ),
                    h6: ({ ...props }) => (
                      <h6 {...props} className="text-lg font-bold mb-2 mt-2" />
                    ),
                    pre: ({ children, ...props }) => {
                      if (
                        React.isValidElement(children) &&
                        children.type === "code" &&
                        (
                          children.props as { className?: string }
                        ).className?.includes("language-mermaid")
                      ) {
                        return (
                          <MermaidRenderer
                            chart={String(
                              (children.props as { children: React.ReactNode })
                                .children
                            )}
                          />
                        );
                      }
                      return (
                        <pre {...props} className="p-4 bg-muted rounded-md">
                          {children}
                        </pre>
                      );
                    },
                    code: ({ children, className, ...props }) => {
                      if (className?.includes("language-mermaid")) {
                        return <MermaidRenderer chart={String(children)} />;
                      }
                      return <code {...props}>{children}</code>;
                    },
                    table: ({ children, ...props }) => (
                      <Table {...props}>{children}</Table>
                    ),
                    thead: ({ children, ...props }) => (
                      <TableHeader {...props}>{children}</TableHeader>
                    ),
                    tbody: ({ children, ...props }) => (
                      <TableBody {...props}>{children}</TableBody>
                    ),
                    tr: ({ children, ...props }) => (
                      <TableRow {...props}>{children}</TableRow>
                    ),
                    th: ({ children, ...props }) => (
                      <TableHead {...props}>{children}</TableHead>
                    ),
                    td: ({ children, ...props }) => (
                      <TableCell {...props}>{children}</TableCell>
                    ),
                    blockquote: ({ children, ...props }) => (
                      <blockquote
                        {...props}
                        className="border-l-2 border-primary pl-4"
                      >
                        {children}
                      </blockquote>
                    ),
                    ul: ({ children, ...props }) => (
                      <ul {...props} className="list-disc ml-4">
                        {children}
                      </ul>
                    ),
                    ol: ({ children, ...props }) => (
                      <ol {...props} className="list-decimal ml-4">
                        {children}
                      </ol>
                    ),
                    li: ({ children, ...props }) => (
                      <li {...props}>{children}</li>
                    ),
                    img: (props) => <ImageWithPlaceholder {...props} />,
                    a: ({ href, children, ...props }) => {
                      let faviconUrl = null;
                      try {
                        if (href && href.startsWith("http")) {
                          const hostname = new URL(href).hostname;
                          faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
                        }
                      } catch {
                        // Invalid URL, no favicon
                      }
                      return (
                        <a
                          {...props}
                          href={href}
                          className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
                        >
                          {faviconUrl && (
                            <Image
                              src={faviconUrl}
                              alt=""
                              width={16}
                              height={16}
                              className="shrink-0"
                              onError={() => { }}
                              unoptimized
                            />
                          )}
                          {children}
                        </a>
                      );
                    },
                    video: ({ ...props }) => <video {...props} controls />,
                    audio: ({ ...props }) => <audio {...props} controls />,
                  }}
                >
                  {msg.content as string}
                </ReactMarkdown>
              )}
              {msg.reasoning && msg.reasoning.length > 0 && (
                <Collapsible defaultOpen={!isStreaming}>
                  <CollapsibleTrigger className="w-full text-left text-sm text-muted-foreground underline">
                    {((!msg.content || msg.content.trim() === "") && (!msg.images || msg.images.length === 0)) ?
                      msg.reasoning.trim().split("\n").slice(-1)[0]
                      :
                      "Show Reasoning"
                    }
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ReactMarkdown>
                      {msg.reasoning as string}
                    </ReactMarkdown>
                  </CollapsibleContent>
                </Collapsible>
              )}
              {msg.images && Array.isArray(msg.images) &&
                msg.images.map(
                  (img, i) =>
                    img.image_url?.url && (
                      <ImageWithPlaceholder key={i} src={img.image_url.url} />
                    )
                )}
            </ItemContent>
          </Item>
        ))}
        {/* Spacer so the chat can be scrolled past the bottom and input doesn't overlap the last message */}
        <div className="h-36 md:h-40" />
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 p-4 pt-16 bg-linear-to-t from-background via-background/50 to-transparent">
        <InputGroup className="shadow-none bg-background">
          <InputGroupInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            className="border-t-0"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" onClick={handleAttach}>
              <Paperclip className="size-4" />
            </InputGroupButton>
            <InputGroupButton size="icon-xs" onClick={handleSend}>
              <Send className="size-4" />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </div >
  );
}
