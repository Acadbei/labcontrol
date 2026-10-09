import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { TeamChatMessage } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requirePermission(request, 'team.chat');
  if (isAuthResponse(user)) return user;
  return NextResponse.json(db.getTeamMessages(), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'team.chat');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    const category = ['general', 'urgent', 'test_report', 'task_update'].includes(body?.category) ? body.category : 'general';
    if (!content || content.length > 4000) return NextResponse.json({ error: 'Xabar 1–4000 belgi bo‘lishi kerak' }, { status: 400 });
    const message: Omit<TeamChatMessage, 'id' | 'timestamp'> = {
      senderId: user.id, senderName: user.name, senderPosition: user.position, senderRole: user.role,
      content, category
    };
    const saved = db.addTeamMessage(message);
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'JAMOA XABARI YUBORILDI', object: 'Jamoa muloqoti', details: 'Jamoa chatiga xabar qo‘shildi', ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(saved, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Xabar yuborilmadi' }, { status: 400 });
  }
}
