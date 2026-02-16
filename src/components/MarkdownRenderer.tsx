"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkEmoji from "remark-emoji";
import rehypeHighlight from "rehype-highlight";
import rehypeRaw from "rehype-raw";
import rehypeKatex from "rehype-katex";
import "highlight.js/styles/github.css";
import "katex/dist/katex.min.css";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Image from "next/image";
import MermaidRenderer from "./MermaidRenderer";
import MediaPreview from "./MediaPreview";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("wrap-break-word", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, remarkEmoji]}
        rehypePlugins={[rehypeHighlight, rehypeKatex, rehypeRaw]}
        components={{
          h1: ({ ...props }) => (
            <h1 {...props} className="text-5xl font-bold mb-2 mt-4" />
          ),
          h2: ({ ...props }) => (
            <h2 {...props} className="text-4xl font-bold mb-2 mt-4" />
          ),
          h3: ({ ...props }) => (
            <h3 {...props} className="text-3xl font-bold mb-2 mt-4" />
          ),
          h4: ({ ...props }) => (
            <h4 {...props} className="text-2xl font-bold mb-2 mt-3" />
          ),
          h5: ({ ...props }) => (
            <h5 {...props} className="text-xl font-bold mb-2 mt-2" />
          ),
          h6: ({ ...props }) => (
            <h6 {...props} className="text-lg font-bold mb-2 mt-2" />
          ),
          pre: ({ children, className, ...props }) => {
            const extractText = (child: any): string => {
              if (typeof child === 'string') return child;
              if (Array.isArray(child)) return child.map(extractText).join('');
              if (child?.props?.children) return extractText(child.props.children);
              return '';
            };

            if (React.isValidElement(children) && (children.props as any)?.className?.includes("language-mermaid")) {
              return <MermaidRenderer chart={extractText(children)} />;
            }

            if (React.isValidElement(children) && (children.props as any)?.className?.includes("language-html")) {
              return (
              <iframe
                className="border rounded-md w-full"
                srcDoc={extractText(children)}
                sandbox="allow-scripts allow-same-origin"
                onLoad={(e) => {
                  const iframe = e.currentTarget;
                  const doc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (doc) {
                    iframe.style.height = Math.min(
                      doc.documentElement.scrollHeight,
                      640
                    ) + "px";
                  }
                }}
              />
              );
            };

            return <pre className="mt-2 p-2 w-full">{children}</pre>;
          },
          code: ({ children, className, ...props }) => {
            return <code className={cn(`p-1 bg-card rounded-md ${className || "language-text"}`, className)} {...props}>
              {children}
            </code>;
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-scroll">
              <Table {...props}>{children}</Table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <TableHeader {...props}>{children}</TableHeader>
          ),
          tbody: ({ children, ...props }) => (
            <TableBody {...props}>{children}</TableBody>
          ),
          tr: ({ children, ...props }) => (
            <TableRow {...props}>{children}</TableRow>
          ),
          th: ({ children, ...props }) => (
            <TableHead {...props}>{children}</TableHead>
          ),
          td: ({ children, ...props }) => (
            <TableCell {...props}>{children}</TableCell>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="border-l-2 border-primary pl-4"
            >
              {children}
            </blockquote>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc ml-4">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal ml-4">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props}>{children}</li>
          ),
          img: ({ src }) => {
            if (!src || typeof src !== 'string') return null;
            return <MediaPreview attachment={{ image_url: { url: src } }} />;
          },
          a: ({ href, children, ...props }) => {
            let faviconUrl = null;
            try {
              if (href && href.startsWith("http")) {
                const hostname = new URL(href).hostname;
                faviconUrl = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
              }
            } catch {
              // Invalid URL, no favicon
            }
            return (
              <a
                {...props}
                href={href}
                className="text-blue-600 hover:text-blue-800 underline inline-flex items-center gap-1"
              >
                {faviconUrl && (
                  <Image
                    src={faviconUrl}
                    alt=""
                    width={16}
                    height={16}
                    className="shrink-0"
                    onError={() => { }}
                    unoptimized
                  />
                )}
                {children}
              </a>
            );
          },
          video: ({ ...props }) => <video {...props} controls />,
          audio: ({ ...props }) => <audio {...props} controls />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
