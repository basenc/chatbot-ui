"use client";

import React, { useEffect, useState, useSyncExternalStore } from "react";
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

export default function LeftPanel() {
  const [open, setOpen] = React.useState(true);
  const [chats, setChats] = useState([]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);

  const handleNewChat = async () => {
    try {
      const response = await fetch("/api/chats/new", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const newChat = await response.json();
        setChats((prevChats) => [...prevChats, newChat]);
      } else {
        console.error("Failed to create new chat");
      }
    } catch (error) {
      console.error("Error creating new chat:", error);
    }
  };

  useEffect(() => {
    fetch("/api/chats")
      .then((res) => res.json())
      .then((data) => setChats(data))
      .catch((err) => console.error("Failed to fetch chats", err));
  }, []);

  return (
    <SidebarProvider open={open} onOpenChange={setOpen}>
      <Sidebar collapsible="none" className="w-full min-h-screen max-h-screen">
        <SidebarHeader>
          <Button onClick={handleNewChat}>New Chat</Button>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Chats</SidebarGroupLabel>
            <SidebarGroupContent>
                {chats.map((chat) => (
                  <Button key={chat.id} variant="ghost" onClick={() => {store.set('currentChatId', chat.id)}}>
                    {chat.name || "Untitled Chat"}
                  </Button>
                ))}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
    </SidebarProvider>
  );
}
