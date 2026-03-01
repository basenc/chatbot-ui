import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  const apiBase = request.headers.get('x-api-base');

  if (!apiKey || !apiBase) {
    return NextResponse.json({ data: [] }, { status: 400 });
  }

  try {
    const openai = new OpenAI({ apiKey, baseURL: apiBase });
    const models = await openai.models.list();
    return NextResponse.json(models);
  } catch {
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
