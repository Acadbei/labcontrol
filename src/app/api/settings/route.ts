import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { OllamaProvider } from '@/lib/ai/provider';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requirePermission(request, 'system.settings');
  if (isAuthResponse(user)) return user;
  const settings = db.getSettings();
  return NextResponse.json({
    aiProvider: settings.aiProvider,
    modelName: settings.modelName,
    laboratoryName: settings.laboratoryName,
    secondBrainTitle: settings.secondBrainTitle,
    providerConfigured: settings.aiProvider === 'ollama' ? Boolean(process.env.OLLAMA_URL || settings.ollamaUrl || 'http://localhost:11434') : true
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'system.settings');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    if (body?.action === 'test_connection') {
      const saved = db.getSettings();
      const provider = body.aiProvider || saved.aiProvider;
      if (provider === 'ollama') {
        const baseUrl = process.env.OLLAMA_URL || saved.ollamaUrl;
        const model = typeof body.modelName === 'string' ? body.modelName : saved.modelName;
        const check = await new OllamaProvider(baseUrl, model).testConnection();
        return NextResponse.json(check, { status: check.success ? 200 : 503 });
      }
      return NextResponse.json({ success: false, message: 'Manba ajratuvchi rejim AI modeliga ulanmaydi; model holati tekshirilmaydi.' }, { status: 503 });
    }

    const allowedProviders = ['local_extractive', 'ollama'];
    const updates: Record<string, string> = {};
    if (typeof body?.aiProvider === 'string' && allowedProviders.includes(body.aiProvider)) updates.aiProvider = body.aiProvider;
    if (typeof body?.modelName === 'string' && body.modelName.trim().length <= 120) updates.modelName = body.modelName.trim();
    if (typeof body?.laboratoryName === 'string' && body.laboratoryName.trim().length <= 160) updates.laboratoryName = body.laboratoryName.trim();
    if (typeof body?.secondBrainTitle === 'string' && body.secondBrainTitle.trim().length <= 160) updates.secondBrainTitle = body.secondBrainTitle.trim();
    const updated = db.updateSettings(updates as any);
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'TIZIM SOZLAMALARI YANGILANDI', object: 'AI provayderi', details: `Provayder turi: ${updated.aiProvider}`, ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json({ aiProvider: updated.aiProvider, modelName: updated.modelName, laboratoryName: updated.laboratoryName, secondBrainTitle: updated.secondBrainTitle });
  } catch {
    return NextResponse.json({ error: 'Sozlamalarni saqlab bo‘lmadi' }, { status: 400 });
  }
}
