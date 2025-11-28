import OpenAI from "openai";

export type ContentPart =
  | { type: "text"; text?: string }
  | { type: "image_url"; image_url: { url?: string } }
  | { type: "video_url"; videoUrl: { url?: string } }
  | { type: "input_audio"; inputAudio: { data?: string; format?: string } }
  | { type: "file"; file: { filename?: string; fileData?: string } };
export type MessageContent = string | ContentPart[]

// A single chat message. We extend the SDK's message type with local UI fields
// for rendering (images, reasoning) and relax content to support ContentPart[].
export type Attachment =
  | { image_url: { url?: string } }
  | { video_url: { url?: string } }
  | { input_audio: { data?: string; format?: string } }
  | { file: { filename?: string; fileData?: string } };

export type Message = Partial<Omit<OpenAI.Chat.ChatCompletionMessageParam, 'content'>> & {
  // Re-type the SDK's content as MessageContent to allow the UI to store
  // `ContentPart[]` arrays (image+text parts) as well as plain strings.
  content?: MessageContent;
  // For backwards compatibility the 'images' array contains attachments of various types
  images?: Attachment[];
  reasoning?: string;
}

export type Delta = OpenAI.Chat.ChatCompletionChunk.Choice.Delta & {
  // Optional fields some models might include that are used in streaming deltas
  reasoning?: string;
  images?: ({ image_url?: { url?: string } } | { file?: { filename?: string; fileData?: string } } | { video_url?: { url?: string } } | { input_audio?: { data?: string; format?: string } })[];
  reasoning_details?: { type: string; summary?: string; data?: string; text?: string }[];
}
