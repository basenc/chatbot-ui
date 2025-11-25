import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const messages = await request.json();
    const newChat = await prisma.chat.create({
      data: {
        name: 'New Chat',
        content: messages,
      }
    });
    return NextResponse.json(newChat);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create chat', details: error }, { status: 500 });
  }
}