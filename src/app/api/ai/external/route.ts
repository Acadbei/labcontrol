import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const requestWindows = new Map<string, { startedAt: number; count: number }>();

function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const current = requestWindows.get(userId);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= 5) return false;
  current.count += 1;
  return true;
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'ai.chat');
  if (isAuthResponse(user)) return user;
  if (!withinRateLimit(user.id)) return NextResponse.json({ error: 'Tashqi qidiruv limiti tugadi; bir daqiqadan keyin urinib ko‘ring.' }, { status: 429 });

  try {
    const body = await request.json();
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt || prompt.length > 4000) return NextResponse.json({ error: 'So‘rov 1–4000 belgi bo‘lishi kerak.' }, { status: 400 });
    if (body?.consent !== true) return NextResponse.json({ error: 'Tashqi AI’ga yuborish tasdiqlanmadi; so‘rov yuborilmadi.' }, { status: 403 });

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return NextResponse.json({ error: 'OpenRouter API kaliti sozlanmagan. Savol tashqi xizmatga yuborilmadi.' }, { status: 503 });

    // AsadbekGPT via local Ollama (permanent, free, offline-capable)
    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen2.5:7b';

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'Sen AsadbekGPT (AcadbekGPT) — LabControl tizimining kuchli sun’iy intellekt modelisan (Ollama qwen2.5:7b). Foydalanuvchi savoliga o‘zbek tilida aniq, chuqur, tushunarli va lo‘nda javob ber.'
          },
          { role: 'user', content: prompt }
        ],
        options: { temperature: 0.2, num_predict: 600, num_ctx: 3072 },
        stream: false
      }),
      signal: AbortSignal.timeout(25_000),
      redirect: 'error',
      cache: 'no-store'
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AsadbekGPT (Ollama) xizmati hozir javob bermadi.' }, { status: 503 });
    }

    const data = await response.json();
    const answer = typeof data?.message?.content === 'string' ? data.message.content.trim() : '';
    if (!answer) return NextResponse.json({ error: 'AsadbekGPT matnli javob qaytarmadi.' }, { status: 503 });

    const message = db.addChatMessage({
      role: 'assistant',
      senderId: user.id,
      content: `AsadbekGPT (Ollama · ${model}) orqali javob:\n\n${answer}`
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'ASADBEKGPT JAVOBI',
      object: 'AsadbekGPT',
      details: `Ollama · ${model} orqali umumiy javob berildi`,
      ip: 'unknown',
      status: 'SUCCESS'
    });

    return NextResponse.json({ assistantMessage: message }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const timedOut = error?.name === 'TimeoutError';
    return NextResponse.json({ error: timedOut ? 'AsadbekGPT javobi kutilgan vaqtda kelmadi.' : 'AsadbekGPT (Ollama) bilan aloqa o‘rnatilmadi.' }, { status: 503 });
  }
}
