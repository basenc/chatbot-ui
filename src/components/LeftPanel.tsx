"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { ChatModel } from '../../prisma/prisma/models/Chat';

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
import { chatStore, chatsStore } from "@/lib/store";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export default function LeftPanel() {
  const [open, setOpen] = React.useState(true);
  const chats = useSyncExternalStore(chatsStore.subscribe, chatsStore.getSnapshot, chatsStore.getServerSnapshot);
  const currentChatId = useSyncExternalStore(chatStore.subscribe, chatStore.getSnapshot, chatStore.getServerSnapshot);

  useEffect(() => {
    fetch("/api/chats")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch chats: ${res.status}`);
        return res.json();
      })
      .then((data) => chatsStore.set(data))
      .catch((err) => console.error("Failed to fetch chats", err));
  }, []);

  const handleNewChat = async () => {
    const existingEphemeral = chats.find(chat => chat.id < 0);
    if (existingEphemeral) {
      chatStore.set(existingEphemeral.id);
      return;
    }
    const tempId = -Date.now();
    const ephemeral = {
      id: tempId,
      name: 'New Chat',
      content: [],
      metadata: { ephemeral: true },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as ChatModel;
    const next = [...chatsStore.getSnapshot(), ephemeral];
    chatsStore.set(next);
    chatStore.set(ephemeral.id);
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      if (chatId < 0) {
        // ephemeral chat - remove from global store
        chatsStore.set(chatsStore.getSnapshot().filter(chat => chat.id !== chatId));
      } else {
        await fetch(`/api/chats/${chatId}`, { method: 'DELETE' });
        chatsStore.set(chatsStore.getSnapshot().filter(chat => chat.id !== chatId));
      }
      if (currentChatId === chatId) {
        chatStore.set(null);
      }
    } catch (error) {
      console.error('Failed to delete chat:', error);
    }
  };

  const handleRenameChat = async (chatId: number) => {
    const newName = prompt('Enter new name for the chat:');
    if (newName && newName.trim()) {
      try {
        if (chatId < 0) {
          // ephemeral - rename locally
          chatsStore.set(chatsStore.getSnapshot().map(chat =>
            chat.id === chatId ? { ...chat, name: newName.trim() } : chat
          ));
        } else {
          await fetch(`/api/chats/${chatId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName.trim() })
          });
          chatsStore.set(chatsStore.getSnapshot().map((chat) =>
            chat.id === chatId ? { ...chat, name: newName.trim() } : chat
          ));
        }
      } catch (error) {
        console.error('Failed to rename chat:', error);
      }
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
                <div key={chat.id} className="flex items-center">
                  <Button
                    variant={currentChatId === chat.id ? "secondary" : "ghost"}
                    className="flex-1 justify-start"
                    onClick={() => chatStore.set(chat.id)}
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
                      <DropdownMenuItem onClick={() => handleRenameChat(chat.id)}>
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteChat(chat.id)} variant="destructive">
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
