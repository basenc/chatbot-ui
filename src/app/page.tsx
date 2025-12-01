"use client";

import { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

import dynamic from 'next/dynamic';
const MiddlePanel = dynamic(() => import('@/components/MiddlePanel'), { ssr: false });
const LeftPanel = dynamic(() => import('@/components/LeftPanel'), { ssr: false });
const RightPanel = dynamic(() => import('@/components/RightPanel'), { ssr: false });

export default function Home() {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [leftSheetOpen, setLeftSheetOpen] = useState(false);
  const [rightSheetOpen, setRightSheetOpen] = useState(false);

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Mobile layout */}
      <div className="md:hidden h-full relative">
        <div className="absolute top-2 left-2 z-10">
          <Sheet open={leftSheetOpen} onOpenChange={setLeftSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <SheetTitle className="sr-only">Chats</SheetTitle>
              <LeftPanel />
            </SheetContent>
          </Sheet>
        </div>
        <div className="absolute top-2 right-2 z-10">
          <Sheet open={rightSheetOpen} onOpenChange={setRightSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <PanelRightOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 w-[280px]">
              <SheetTitle className="sr-only">Settings</SheetTitle>
              <RightPanel />
            </SheetContent>
          </Sheet>
        </div>
        <MiddlePanel />
      </div>

      {/* Desktop layout */}
      <ResizablePanelGroup direction="horizontal" className="hidden md:flex flex-1" autoSaveId="main-layout">
        {leftOpen && (
          <>
            <ResizablePanel defaultSize={20} minSize={15} id="left-panel">
              <LeftPanel />
            </ResizablePanel>
            <ResizableHandle withHandle />
          </>
        )}
        <ResizablePanel defaultSize={leftOpen && rightOpen ? 60 : leftOpen || rightOpen ? 80 : 100} minSize={40} id="middle-panel">
          <div className="relative h-full">
            <div className="absolute top-2 left-2 z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLeftOpen(!leftOpen)}>
                {leftOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </Button>
            </div>
            <div className="absolute top-2 right-2 z-10">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setRightOpen(!rightOpen)}>
                {rightOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              </Button>
            </div>
            <MiddlePanel />
          </div>
        </ResizablePanel>
        {rightOpen && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={20} minSize={15} id="right-panel">
              <RightPanel />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
}
