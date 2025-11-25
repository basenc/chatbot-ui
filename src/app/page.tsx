"use client";

import dynamic from 'next/dynamic';
import LeftPanel from '@/components/LeftPanel';
import RightPanel from '@/components/RightPanel';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';

const MiddlePanel = dynamic(() => import('@/components/MiddlePanel'), { ssr: false });

export default function Home() {
  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-screen h-screen w-full">
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
