"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { chatIDStore, chatsStore } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { chatsCache } from "@/lib/odm";
import { Chat } from "@/lib/odm";
import ToastErrDetail from "./ToastErrDetail";
import bip39Words from "@/lib/bip39.json";

export default function LeftPanel() {
  const [open, setOpen] = React.useState(true);
  const chats = useSyncExternalStore(chatsStore.subscribe, chatsStore.getSnapshot, chatsStore.getServerSnapshot);
  const currentChatId = useSyncExternalStore(chatIDStore.subscribe, chatIDStore.getSnapshot, chatIDStore.getServerSnapshot);

  useEffect(() => {
    chatsStore.set(Array.from(chatsCache.values()));
  }, []);

  const handleNewChat = async () => {
    try {
      const chat = new Chat({ name: generateChatName(), messages: [], metadata: {} }, {
        onCreated: (id) => {
          chatsStore.set([...chats, chat]);
          chatIDStore.set(id);
        }
      });
    } catch (error) {
      console.error("Failed to create new chat:", error);
      ToastErrDetail({ mes: "Failed to create new chat.", error: String(error) });
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    try {
      const chat = chats.find(c => c.id === chatId);
      if (chat) {
        chat.delete();
        const updatedChats = chats.filter(c => c.id !== chatId);
        chatsStore.set(updatedChats);
        if (updatedChats.length > 0) {
          chatIDStore.set(updatedChats[0].id);
        } else {
          chatIDStore.set(null);
        }
      }
    } catch (error) {
      console.error("Failed to delete chat:", error);
      ToastErrDetail({ mes: "Failed to delete chat.", error: String(error) });
    }
  };

  function generateChatName(): string {
    const word1 = bip39Words[Math.floor(Math.random() * bip39Words.length)];
    const word2 = bip39Words[Math.floor(Math.random() * bip39Words.length)];
    return `${word1} ${word2}`;
  }

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar collapsible="none" className="w-full min-h-screen max-h-screen">
        <SidebarHeader>
          <Button onClick={handleNewChat}>New Chat</Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent className="flex flex-col gap-2">
              {chats.map((chat) => (
                <div key={String(chat.id)} className="group/chat relative">
                  <Button
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => chatIDStore.set(String(chat.id))}
                  >
                    <span className="truncate">{chat.name || "Untitled Chat"}</span>
                  </Button>
                  <div className="absolute bottom-1 right-1 opacity-0 group-hover/chat:opacity-100 transition-opacity">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleDeleteChat(String(chat.id))} variant="destructive">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </SidebarProvider>
  );
}
