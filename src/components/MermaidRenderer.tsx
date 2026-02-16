"use client";

import React, { useEffect, useRef } from "react";
import mermaid from "mermaid";
import { toast } from "sonner";

interface MermaidRendererProps {
  chart: string;
  className?: string;
}

mermaid.initialize({ startOnLoad: false, theme: "neutral" });

export default function MermaidRenderer({ chart, className }: MermaidRendererProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let mounted = true;
    const id = "mermaid-" + Math.random().toString(36).slice(2, 9);

    (async () => {
      try {
        await mermaid.parse(chart);
        if (!mounted || !ref.current) return;

        const { svg } = await mermaid.render(id, chart);
        if (mounted && ref.current) ref.current.innerHTML = svg;
      } catch (e) {
        console.error("Mermaid render failed", e);
        document.getElementById(id)?.remove();

        if (mounted && ref.current) {
          ref.current.textContent = chart;
          toast.error(
            "Failed to render mermaid diagram. Displaying as plain text."
          );
        }
      }
    })();

    return () => {
      mounted = false;
      document.getElementById(id)?.remove();
    };
  }, [chart]);

  return <div ref={ref} className={`overflow-auto ${className || ""}`} />;
}