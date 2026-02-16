"use client";

import React, {
  useState,
  useEffect,
  useSyncExternalStore,
  useRef,
  useCallback,
} from "react";
import { ScrollArea } from "./ui/scroll-area";
import { chatIDStore, chatsStore } from "@/lib/store";
import { chatsCache, Chat } from "@/lib/odm";
import { Spinner } from "./ui/spinner";
import { Message } from "@/types/openai";
import { chatCompletion, prepareMessagesForAPI, trimObject, generateChatName } from "@/lib/utils";
import MessageItem from "./MessageItem";
import ChatInput from "./ChatInput";
import ToastErrDetail from "./ToastErrDetail";

export default function MiddlePanel() {
  const [input, setInput] = useState<Message>({ content: "", images: [], role: "user" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const currentChatId = useSyncExternalStore(
    chatIDStore.subscribe,
    chatIDStore.getSnapshot,
    chatIDStore.getServerSnapshot
  );
  const messagesRef = useRef<Message[]>(messages);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (currentChatId) {
      const loadedMessages = chatsCache.get(String(currentChatId))?.messages || [];
      setMessages(loadedMessages);
      messagesRef.current = loadedMessages;
    } else {
      setTimeout(() => setMessages([]), 0);
      messagesRef.current = [];
    }
    setShowTypingIndicator(false);
    setIsStreaming(false);
  }, [currentChatId]);

  const handleSend = async () => {
    if (isStreaming || (!input.content && input.images?.length === 0)) return;

    let chat = currentChatId ? chatsCache.get(String(currentChatId)) : null;

    if (!chat) {
      const newChat = new Chat({ name: "New Chat", messages: [], metadata: {} }, {
        onCreated: (id) => {
          chatsStore.set([...chatsStore.getSnapshot(), newChat]);
          chatIDStore.set(id);
        }
      });
      chat = newChat;
      await new Promise<void>(resolve => {
        const unsubscribe = chatIDStore.subscribe(() => {
          if (chatIDStore.getSnapshot()) {
            unsubscribe();
            resolve();
          }
        });
      });
    }

    messagesRef.current = [...messagesRef.current, input];

    setMessages(messagesRef.current);
    setInput({ content: "", images: [], role: "user" });

    if (messagesRef.current.length === 1) {
      (async () => {
        const generatedName = await generateChatName(typeof input.content === 'string' ? input.content : '');
        chat?.update({ name: generatedName });
      })();
    }

    await streamResponse(chat);
  };

  const streamResponse = async (chat: ReturnType<typeof chatsCache.get>) => {
    if (!chat) return;

    setShowTypingIndicator(true);
    setIsStreaming(true);

    // Create new AbortController for this stream
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = chatCompletion(prepareMessagesForAPI(messagesRef.current), false, signal);
      const acc: Message = {};
      messagesRef.current = [...messagesRef.current, acc];
      for await (const delta of response) {
        if (signal.aborted) break;
        if (delta.content) {
          setShowTypingIndicator(false);
          acc.content = (acc.content || '') + delta.content;
        }
        if (delta.reasoning) {
          acc.reasoning = (acc.reasoning || '') + delta.reasoning;
        }
        if (delta.images && Array.isArray(delta.images) && delta.reasoning_details && Array.isArray(delta.reasoning_details) && delta.reasoning_details.length === 0) {
          setShowTypingIndicator(false);
          acc.images = [...(acc.images || []), ...delta.images];
        }
        setMessages([...messagesRef.current]);
      }
      console.log(trimObject(acc));
      chat.update({ messages: messagesRef.current });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Stream cancelled');
        // Save partial response if any content was generated
        chat.update({ messages: messagesRef.current });
      } else {
        console.error("Stream failed:", error);
        ToastErrDetail({ mes: "Failed to get response", error: error instanceof Error ? error : String(error) });
        throw error;
      }
    } finally {
      abortControllerRef.current = null;
      setIsStreaming(false);
      setShowTypingIndicator(false);
    }
  };

  const createAttachment = useCallback((file: File, dataUrl: string) => {
    const type = file.type;
    if (type.startsWith('image/')) {
      return { image_url: { url: dataUrl } };
    } else if (type.startsWith('video/')) {
      return { video_url: { url: dataUrl } };
    } else if (type.startsWith('audio/')) {
      return { input_audio: { data: dataUrl, format: type.split('/')[1] } };
    } else {
      return { file: { filename: file.name, fileData: dataUrl } };
    }
  }, []);

  const addAttachmentFromFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (result && typeof result === 'string') {
        setInput(prev => ({ ...prev, images: [...(prev.images || []), createAttachment(file, result)] }));
      }
    };
    reader.readAsDataURL(file);
  }, [createAttachment]);

  const handleAttach = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = async () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        addAttachmentFromFile(file);
      }
    };
    fileInput.click();
  }, [addAttachmentFromFile]);

  const handleEdit = useCallback((idx: number) => {
    const msg = messagesRef.current[idx];
    setEditingIdx(idx);
    setEditingMessage({ ...msg, images: msg.images ? [...msg.images] : [] });
  }, []);

  const handleEditSave = useCallback(() => {
    if (editingIdx === null || !editingMessage) return;
    const newMessages = [...messages];
    newMessages[editingIdx] = editingMessage;
    setMessages(newMessages);
    messagesRef.current = newMessages;
    const chat = chatsCache.get(String(currentChatId));
    chat?.update({ messages: newMessages });
    setEditingIdx(null);
    setEditingMessage(null);
  }, [editingIdx, editingMessage, messages, currentChatId]);

  const handleEditCancel = useCallback(() => {
    setEditingIdx(null);
    setEditingMessage(null);
  }, []);

  const handleEditAddAttachment = useCallback(() => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.onchange = () => {
      if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (result && typeof result === 'string') {
            const attachment = createAttachment(file, result);
            setEditingMessage(prev => prev ? {
              ...prev,
              images: [...(prev.images || []), attachment]
            } : null);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    fileInput.click();
  }, [createAttachment]);

  const handleEditRemoveAttachment = useCallback((imgIdx: number) => {
    setEditingMessage(prev => prev ? {
      ...prev,
      images: (prev.images || []).filter((_, i) => i !== imgIdx)
    } : null);
  }, []);

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleRegenerate = useCallback(async (idx: number) => {
    if (isStreaming) return;

    const chat = chatsCache.get(String(currentChatId));
    if (!chat) return;

    const msg = messagesRef.current[idx];
    const messagesToKeep = msg.role === "user"
      ? messagesRef.current.slice(0, idx + 1)
      : messagesRef.current.slice(0, idx);
    messagesRef.current = messagesToKeep;
    setMessages(messagesToKeep);

    await streamResponse(chat);
  }, [isStreaming, currentChatId]);

  const handleDelete = useCallback((idx: number) => {
    const newMessages = messagesRef.current.filter((_, i) => i !== idx);
    setMessages(newMessages);
    messagesRef.current = newMessages;
    const chat = chatsCache.get(String(currentChatId));
    chat?.update({ messages: newMessages });
  }, [currentChatId]);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile();
      if (file) {
        addAttachmentFromFile(file);
      }
    }
  }, [addAttachmentFromFile]);

  const handleRemoveInputAttachment = useCallback((idx: number) => {
    setInput(prev => ({ ...prev, images: (prev.images || []).filter((_, i) => i !== idx) }));
  }, []);

  const handleEditChange = useCallback((content: string) => {
    setEditingMessage(prev => prev ? { ...prev, content } : null);
  }, []);

  const handleInputChange = useCallback((content: string) => {
    setInput(prev => ({ ...prev, content }));
  }, []);

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="overflow-hidden">
        {messages.map((msg, idx) => (
          <MessageItem
            key={idx}
            msg={msg}
            idx={idx}
            isStreaming={isStreaming}
            isEditing={editingIdx === idx}
            editingMessage={editingMessage}
            onEdit={handleEdit}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
            onEditChange={handleEditChange}
            onEditAddAttachment={handleEditAddAttachment}
            onEditRemoveAttachment={handleEditRemoveAttachment}
            onRegenerate={handleRegenerate}
            onDelete={handleDelete}
          />
        ))}
        {showTypingIndicator && (
          <Spinner className="m-8 mt-4" />
        )}
        {/* Spacer so the chat can be scrolled past the bottom and input doesn't overlap the last message */}
        <div className="h-36" />
      </ScrollArea>
      <ChatInput
        input={input}
        isStreaming={isStreaming}
        onInputChange={handleInputChange}
        onSend={handleSend}
        onStop={handleStop}
        onAttach={handleAttach}
        onPaste={handlePaste}
        onRemoveAttachment={handleRemoveInputAttachment}
      />
    </div>
  );
}
