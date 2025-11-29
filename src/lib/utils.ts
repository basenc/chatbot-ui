"use client";

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import OpenAI from "openai"
import { Message, Delta } from "@/types/openai"
import { settingsCache } from "./odm"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trimObject(obj: any, maxLen = 80): any {
  if (typeof obj === 'string' && obj.length > maxLen) return obj.slice(0, maxLen) + '...';
  if (Array.isArray(obj)) return obj.map(item => trimObject(item, maxLen));
  if (obj && typeof obj === 'object') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trimmed: any = {};
    for (const key in obj) {
      trimmed[key] = trimObject(obj[key], maxLen);
    }
    return trimmed;
  }
  return obj;
};

const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bodyInfo: any = {};
  if (init?.body && typeof init.body === 'string') {
    try {
      const parsed = JSON.parse(init.body);
      bodyInfo = trimObject(parsed);
    } catch { }
  }
  console.log({
    url: input,
    method: init?.method,
    body: bodyInfo
  });
  return fetch(input, init);
};

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

export async function* chatCompletion(messages: Message[], isTaskModel = false): AsyncGenerator<Delta> {
  const openai_api_key = settingsCache.get("openai_api_key");
  const openai_api_base = settingsCache.get("openai_api_base");
  const model = isTaskModel ? settingsCache.get("openai_task_model") : settingsCache.get("openai_model")

  if (!model || typeof model.value !== 'string') throw new Error("OpenAI model is not set");
  if (!openai_api_key?.value || typeof openai_api_key.value !== 'string') throw new Error("OpenAI API key is not set");
  if (!openai_api_base?.value || typeof openai_api_base.value !== 'string') throw new Error("OpenAI API base URL is not set");

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openai_api_key.value,
    baseURL: openai_api_base.value,
    fetch: customFetch,
  });

  const stream = await openai.chat.completions.create({
    model: model.value,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    messages: messages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
    stream: true,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0].delta;
    yield delta;
  }
}

export function getOAIModelsList() {
  const openai_api_key = settingsCache.get("openai_api_key");
  const openai_api_base = settingsCache.get("openai_api_base");

  if (!openai_api_key?.value || typeof openai_api_key.value !== 'string') throw new Error("OpenAI API key is not set");
  if (!openai_api_base?.value || typeof openai_api_base.value !== 'string') throw new Error("OpenAI API base URL is not set");

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openai_api_key.value,
    baseURL: openai_api_base.value,
    fetch: customFetch,
  });

  return openai.models.list();
}