import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import OpenAI from 'openai'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const apiKey = settings.find(s => s.key === 'openai_api_key')?.value as string
    const apiBase = settings.find(s => s.key === 'openai_api_base')?.value as string

    if (!apiKey || !apiBase) {
      return NextResponse.json({ error: 'OpenAI settings not configured' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey, baseURL: apiBase })
    const models = await openai.models.list()
    return NextResponse.json(models.data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch models', details: error }, { status: 500 })
  }
}