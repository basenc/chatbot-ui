import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

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

    if (chat.name !== 'New Chat') {
      return NextResponse.json({ name: chat.name })
    }

    const settingsArray = await prisma.setting.findMany()
    const settings = new Map(settingsArray.map(s => [s.key, s.value]))
    const apiKey = settings.get('openai_api_key') as string
    const apiBase = settings.get('openai_api_base') as string
    const model = settings.get('openai_model') as string
    const taskModel = settings.get('openai_task_model') as string

    if (!apiKey || !apiBase || !model || !taskModel) {
      return NextResponse.json({ error: 'OpenAI settings not configured' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey, baseURL: apiBase })
    const titlePrompt = `Generate a short, concise title (max 50 characters) for this chat based on the user's first message: "${message}"`

    const response = await openai.chat.completions.create({
      model: taskModel,
      messages: [{ role: 'user', content: titlePrompt }],
    })

    const rawTitle = response.choices[0]?.message?.content ?? ''
    const cleaned = rawTitle
      .replace(/[^\p{L}\s]+/gu, '')
      .trim()

    const newName = cleaned.length > 0 ? cleaned : 'New Chat'

    await prisma.chat.update({
      where: {
        id: parseInt(id)
      },
      data: {
        name: newName
      }
    })

    return NextResponse.json({ name: newName })
  } catch (error) {
    console.error('Failed to generate title:', error)
    return NextResponse.json({ error: 'Failed to generate title', details: error }, { status: 500 })
  }
}
