import OpenAI from "openai";

export type ContentPart = { type: "text" | "image_url"; text?: string; image_url?: { url: string }; }
export type MessageContent = string | ContentPart[]

export type Message = OpenAI.Chat.ChatCompletionMessage[] | ContentPart[]

export type Delta = OpenAI.Chat.ChatCompletionChunk.Choice.Delta |
{ images: { image_url: { url: string } }[] } |
{ reasoning_details: { type: string; summary?: string; data?: string, text?: string }[] }
