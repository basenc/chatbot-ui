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

export default function LeftPanel() {
  const [open, setOpen] = React.useState(true);
  const chats = useSyncExternalStore(chatsStore.subscribe, chatsStore.getSnapshot, chatsStore.getServerSnapshot);
  const currentChatId = useSyncExternalStore(chatIDStore.subscribe, chatIDStore.getSnapshot, chatIDStore.getServerSnapshot);

  useEffect(() => {
    chatsStore.set(Array.from(chatsCache.values()));
  }, []);

  const handleNewChat = async () => {
    try {
      const chat = new Chat({ name: "New Chat", messages: [], metadata: {} });
      chatsStore.set([...chats, chat]);
      chatIDStore.set(chat.id);
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
                <div key={String(chat.id)} className="flex items-center">
                  <Button
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    className="flex-1 justify-start"
                    onClick={() => chatIDStore.set(String(chat.id))}
                  >
                    {chat.name || "Untitled Chat"}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleDeleteChat(String(chat.id))} variant="destructive">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
