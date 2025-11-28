"use client";

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import OpenAI from "openai"
import { Message, Delta } from "@/types/openai"
import { settingsCache } from "./odm"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function* chatCompletion(messages: Message[], model: string): AsyncGenerator<Delta> {
  const openai_api_key = settingsCache.get("openai_api_key");
  const openai_api_base = settingsCache.get("openai_api_base");

  if (!openai_api_key?.value || typeof openai_api_key.value !== 'string') throw new Error("OpenAI API key is not set");
  if (!openai_api_base?.value || typeof openai_api_base.value !== 'string') throw new Error("OpenAI API base URL is not set");

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openai_api_key.value,
    baseURL: openai_api_base.value,
  });

  const stream = await openai.chat.completions.create({
    model: model,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    messages: messages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;
    yield delta;
  }
}