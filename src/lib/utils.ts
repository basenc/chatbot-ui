"use client";

import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import OpenAI from "openai"
import { Message, Delta, ContentPart } from "@/types/openai"
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

export async function* chatCompletion(messages: Message[], isTaskModel = false, signal?: AbortSignal): AsyncGenerator<Delta> {
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
    timeout: 60000,
  });

  const stream = await openai.chat.completions.create({
    model: model.value,
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    messages: messages as unknown as OpenAI.Chat.ChatCompletionMessageParam[],
    stream: true,
  }, { signal });

  for await (const chunk of stream) {
    if (signal?.aborted) break;
    const delta = chunk.choices[0].delta;
    yield delta;
  }
}

export function getOAIModelsList(): Promise<{ data: { id: string }[] }> {
  const openai_api_key = settingsCache.get("openai_api_key");
  const openai_api_base = settingsCache.get("openai_api_base");

  const emptyResult: { data: { id: string }[] } = { data: [] };

  if (!openai_api_key?.value || typeof openai_api_key.value !== 'string') {
    return Promise.resolve(emptyResult);
  }
  if (!openai_api_base?.value || typeof openai_api_base.value !== 'string') {
    return Promise.resolve(emptyResult);
  }

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openai_api_key.value,
    baseURL: openai_api_base.value,
    fetch: customFetch,
  });

  return openai.models.list();
}

export async function generateChatName(userMessage: string): Promise<string> {
  const openai_api_key = settingsCache.get("openai_api_key");
  const openai_api_base = settingsCache.get("openai_api_base");
  const model = settingsCache.get("openai_task_model");

  if (!model || typeof model.value !== 'string') throw new Error("OpenAI task model is not set");
  if (!openai_api_key?.value || typeof openai_api_key.value !== 'string') throw new Error("OpenAI API key is not set");
  if (!openai_api_base?.value || typeof openai_api_base.value !== 'string') throw new Error("OpenAI API base URL is not set");

  const openai = new OpenAI({
    dangerouslyAllowBrowser: true,
    apiKey: openai_api_key.value,
    baseURL: openai_api_base.value,
    fetch: customFetch,
  });

  const response = await openai.chat.completions.create({
    model: model.value,
    messages: [{ role: "user", content: userMessage }],
    tools: [{
      type: "function",
      function: {
        name: "set_chat_name",
        description: "Set a short, descriptive name for this chat based on the user's message",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "A concise chat name (2-5 words) that captures the topic or intent"
            }
          },
          required: ["name"]
        }
      }
    }],
    tool_choice: { type: "function", function: { name: "set_chat_name" } }
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (toolCall && 'function' in toolCall && toolCall.function?.arguments) {
    const args = JSON.parse(toolCall.function.arguments);
    return args.name?.trim() || "New Chat";
  }
  return "New Chat";
}

export const prepareMessagesForAPI = (messages: Message[]): Message[] => {
  return messages.map(msg => {
    if (!msg.images || msg.images.length === 0) return msg;

    const contentParts: ContentPart[] = [];
    if (msg.content) {
      if (typeof msg.content === 'string') {
        contentParts.push({ type: "text", text: msg.content });
      } else {
        contentParts.push(...msg.content);
      }
    }
    msg.images.forEach(attachment => {
      if ('image_url' in attachment && attachment.image_url?.url) {
        contentParts.push({ type: "image_url", image_url: { url: attachment.image_url.url } });
      } else if ('video_url' in attachment && attachment.video_url?.url) {
        contentParts.push({ type: "video_url", videoUrl: { url: attachment.video_url.url } });
      } else if ('input_audio' in attachment && attachment.input_audio?.data) {
        contentParts.push({ type: "input_audio", inputAudio: { data: attachment.input_audio.data, format: attachment.input_audio.format } });
      } else if ('file' in attachment && attachment.file?.fileData) {
        contentParts.push({ type: "file", file: { filename: attachment.file.filename, fileData: attachment.file.fileData } });
      }
    });

    return { ...msg, content: contentParts };
  });
};