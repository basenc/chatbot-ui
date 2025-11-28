"use client";

import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

import dynamic from 'next/dynamic';
const MiddlePanel = dynamic(() => import('@/components/MiddlePanel'), { ssr: false });
const LeftPanel = dynamic(() => import('@/components/LeftPanel'), { ssr: false });
const RightPanel = dynamic(() => import('@/components/RightPanel'), { ssr: false });

export default function Home() {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-screen w-screen">
      <ResizablePanel defaultSize={20} minSize={20}>
        <LeftPanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50} minSize={50}>
        <MiddlePanel />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={20} minSize={20}>
        <RightPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
