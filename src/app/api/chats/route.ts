import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const chats = await prisma.chat.findMany({
      orderBy: {
        updatedAt: 'asc'
      }
    })
    return NextResponse.json(chats)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch chats', details: error }, { status: 500 })
  }
}