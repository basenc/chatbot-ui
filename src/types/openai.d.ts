import OpenAI from "openai";

export type Attachment =
  | { image_url: { url: string } }
  | { video_url: { url: string } }
  | { input_audio: { data: string; format: string } }
  | { file: { filename: string; fileData: string } };

export type ContentPart =
  | { type: "text"; text?: string }
  | { type: "image_url"; image_url: { url?: string } }
  | { type: "video_url"; videoUrl: { url?: string } }
  | { type: "input_audio"; inputAudio: { data?: string; format?: string } }
  | { type: "file"; file: { filename?: string; fileData?: string } };
export type MessageContent = string | ContentPart[]

export type Message = Partial<Omit<OpenAI.Chat.ChatCompletionMessageParam, 'content'>> & {
  content?: MessageContent;
  images?: Attachment[];
  reasoning?: string;
}

export type Delta = OpenAI.Chat.ChatCompletionChunk.Choice.Delta & {
  reasoning?: string;
  images?: Attachment[];
  reasoning_details?: { type: string; summary?: string; data?: string; text?: string }[];
}
