import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requireUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isAuthResponse(user)) return user;
  return NextResponse.json({ user }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request) {
  const user = await requireUser(request);
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const avatar = body?.avatar;
    if (typeof avatar !== 'string' || avatar.length > 1_400_000 || (avatar !== '' && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(avatar))) {
      return NextResponse.json({ error: 'Profil rasmi PNG, JPEG yoki WebP bo‘lishi va 1 MB dan oshmasligi kerak' }, { status: 400 });
    }
    const updated = db.updateUser(user.id, { avatar: avatar || undefined });
    return NextResponse.json({ success: true, user: { ...updated, permissions: user.permissions, phone: undefined } });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Profilni saqlab bo‘lmadi' }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: 'POST usuli o‘chirilgan' }, { status: 405 });
}
