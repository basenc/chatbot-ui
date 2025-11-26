"use client";

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { toast } from "sonner";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

export default function MermaidRenderer({ chart, className }: MermaidRendererProps) {
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

  return <div ref={ref} className={`overflow-auto ${className || ""}`} />;
}