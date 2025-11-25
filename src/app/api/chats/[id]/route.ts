import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'
import type { ChatCompletionMessage } from 'openai/resources/chat/completions';

const truncateLongStrings = (obj: unknown, maxLength: number = 100): unknown => {
  if (typeof obj === 'string' && obj.length > maxLength) {
    return obj.slice(0, maxLength) + '...';
  }
  if (Array.isArray(obj)) {
    return obj.map(item => truncateLongStrings(item, maxLength));
  }
  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      result[k] = truncateLongStrings(v, maxLength);
    }
    return result;
  }
  return obj;
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chat = await prisma.chat.findUnique({
      where: {
        id: parseInt(id)
      }
    })
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }
    return NextResponse.json(chat)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chat', details: error }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const { message } = body

    const chat = await prisma.chat.findUnique({
      where: {
        id: parseInt(id)
      }
    })
    if (!chat) {
      return NextResponse.json({ error: 'Chat not found' }, { status: 404 })
    }

    const settingsArray = await prisma.setting.findMany()
    const settings = new Map(settingsArray.map(s => [s.key, s.value]))
    const apiKey = settings.get('openai_api_key') as string
    const apiBase = settings.get('openai_api_base') as string
    const model = settings.get('openai_model') as string

    if (!apiKey) {
      return NextResponse.json({ error: 'OpenAI API key not set' }, { status: 400 })
    }
    if (!apiBase) {
      return NextResponse.json({ error: 'OpenAI API base not set' }, { status: 400 })
    }
    if (!model) {
      return NextResponse.json({ error: 'OpenAI model not set' }, { status: 400 })
    }

    const originalFetch = global.fetch;
    global.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
      console.debug(url, options);
      return originalFetch(url, options);
    };

    const openai = new OpenAI({ apiKey, baseURL: apiBase })
    const messages: ChatCompletionMessage[] = chat.content as unknown as ChatCompletionMessage[];
    messages.push(message)

    const stream = await openai.chat.completions.create({
      model,
      messages,
      stream: true,
      body: {
        modalities: ['image', 'text']
      }
    } as Omit<OpenAI.Chat.Completions.ChatCompletionCreateParams, 'body'> & { body: { modalities: string[] } })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>) {
            console.debug(JSON.stringify(truncateLongStrings(chunk)));
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'))
          }
        } catch (err) {
          console.error(err)
          controller.enqueue(encoder.encode(JSON.stringify({ error: String(err) }) + '\n'))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message', details: error }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.chat.delete({
      where: {
        id: parseInt(id)
      }
    })
    return NextResponse.json({ message: 'Chat deleted successfully' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete chat', details: error }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json()
    const updatedChat = await prisma.chat.update({
      where: {
        id: parseInt(id)
      },
      data: body
    })
    return NextResponse.json(updatedChat)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update chat', details: error }, { status: 500 })
  }
}