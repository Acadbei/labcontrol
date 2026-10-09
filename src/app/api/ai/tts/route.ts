import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { cyrillicToLatin } from '@/lib/transliterate';
import { spawn } from 'child_process';
import path from 'path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ttsWindows = new Map<string, { startedAt: number; count: number }>();
const DEFAULT_VOICE = 'uz-UZ-MadinaNeural';

function resolveVoice(voice?: string): string {
  if (voice === 'Puck' || voice === 'uz-UZ-SardorNeural') {
    return 'uz-UZ-SardorNeural';
  }
  return DEFAULT_VOICE;
}

function allowed(userId: string): boolean {
  const now = Date.now();
  const current = ttsWindows.get(userId);
  if (!current || now - current.startedAt > 60_000) {
    ttsWindows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= 30) return false;
  current.count += 1;
  return true;
}

function generateSpeechBuffer(text: string, voice: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'edge-tts-stream.py');
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const py = spawn(pythonBin, [scriptPath, voice], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1'
      }
    });

    const chunks: Buffer[] = [];
    let errOutput = '';

    py.stdout.on('data', chunk => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });

    py.stderr.on('data', errChunk => {
      errOutput += errChunk.toString();
    });

    py.on('error', err => {
      reject(err);
    });

    py.on('close', code => {
      if (code !== 0 || chunks.length === 0) {
        reject(new Error(errOutput || `Edge-TTS jarayoni ${code} kodi bilan tugadi`));
        return;
      }
      resolve(Buffer.concat(chunks));
    });

    // Strip code blocks, markdown formatting, citations and raw URLs before sending to TTS
    let cleaned = text
      .replace(/```[\s\S]*?```/g, '') // remove code blocks
      .replace(/`([^`]+)`/g, '$1') // inline code
      .replace(/\[S\d+\]/g, '') // citations like [S1]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // markdown links
      .replace(/https?:\/\/\S+/g, '') // raw urls
      .replace(/[*#_~>|]/g, '') // markdown formatting
      .replace(/^\s*[-+*]\s+/gm, '') // list bullets
      .replace(/\s+/g, ' ')
      .trim();

    // Convert Cyrillic to Latin so uz-UZ neural model reads smoothly
    const cleanText = cyrillicToLatin(cleaned);

    py.stdin.write(Buffer.from(cleanText, 'utf-8'));
    py.stdin.end();
  });
}

export async function POST(request: NextRequest) {
  const user = await requirePermission(request, 'ai.chat');
  if (isAuthResponse(user)) return user;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'So‘rov JSON formatida bo‘lishi kerak' }, { status: 400 });
  }

  if (body?.externalConsent === false) {
    return NextResponse.json({ error: 'Tashqi TTS xizmatiga ruxsat berilmadi.' }, { status: 403 });
  }

  if (typeof body?.text !== 'string' || body.text.length > 5000) {
    return NextResponse.json({ error: 'Ovozga aylantiriladigan matn 5000 belgidan oshmasin' }, { status: 400 });
  }

  const text = body.text.trim();
  if (!text) {
    return NextResponse.json({ error: 'O‘qish uchun matn topilmadi' }, { status: 400 });
  }

  if (!allowed(user.id)) {
    return NextResponse.json({ error: 'Ovozli so‘rovlar limiti oshdi. Birozdan keyin urinib ko‘ring.' }, { status: 429 });
  }

  const voice = resolveVoice(body?.voice);

  try {
    const audioBuffer = await generateSpeechBuffer(text, voice);
    return new Response(new Uint8Array(audioBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch (error: any) {
    console.error('Edge-TTS error:', error);
    return NextResponse.json(
      {
        error: 'Edge-TTS ovoz generatsiya qilishda xatolik yuz berdi. Brauzer ovozi orqali o‘qiladi.',
        fallback: true
      },
      { status: 503 }
    );
  }
}
