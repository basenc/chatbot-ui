import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    const settingsObj: Record<string, any> = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, any>)
    return NextResponse.json(settingsObj)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings', details: error }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body: Record<string, any> = await request.json()
    // body is { key: value }
    const updates = Object.entries(body).map(([key, value]) => ({
      where: { key },
      update: { value },
      create: { key, value }
    }))
    await prisma.$transaction(
      updates.map(update => prisma.setting.upsert(update))
    )
    return NextResponse.json({ message: 'Settings updated' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings', details: error }, { status: 500 })
  }
}