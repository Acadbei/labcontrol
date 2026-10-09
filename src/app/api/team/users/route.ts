import { NextResponse } from 'next/server';
import argon2 from 'argon2';
import { db } from '@/lib/db';
import { isAuthResponse, removePasswordCredential, requirePermission, storePasswordCredential } from '@/lib/auth';
import { UserPosition } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const POSITIONS: UserPosition[] = [
  'Frontend dasturchi',
  'Umumiy dasturchi',
  'Konstruktor, 3D loyihalovchi'
];

export async function POST(request: Request) {
  const actor = await requirePermission(request, 'users.create');
  if (isAuthResponse(actor)) return actor;
  if (process.env.LABCONTROL_DEMO_MODE === 'true') {
    return NextResponse.json({ error: 'Haqiqiy xodim hisobini demo rejimda yaratib bo‘lmaydi' }, { status: 409 });
  }

  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'So‘rov formati noto‘g‘ri' }, { status: 400 }); }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body?.password === 'string' ? body.password : '';
  const position = body?.position as UserPosition;

  if (name.length < 2 || name.length > 120) {
    return NextResponse.json({ error: 'Xodim ismi 2–120 belgi bo‘lishi kerak' }, { status: 400 });
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Elektron pochta manzili noto‘g‘ri' }, { status: 400 });
  }
  if (!POSITIONS.includes(position)) {
    return NextResponse.json({ error: 'Lavozim ro‘yxatdan tanlanishi kerak' }, { status: 400 });
  }
  if (password.length < 12 || password.length > 1024) {
    return NextResponse.json({ error: 'Boshlang‘ich parol 12–1024 belgi bo‘lishi kerak' }, { status: 400 });
  }
  if (db.getUserByEmail(email) || db.getUserByLoginId(email)) {
    return NextResponse.json({ error: 'Bu elektron pochta bilan hisob mavjud' }, { status: 409 });
  }

  const encodedHash = await argon2.hash(password, { type: argon2.argon2id });
  try {
    const stored = await storePasswordCredential(email, encodedHash);
    if (!stored) return NextResponse.json({ error: 'Bu login uchun credential avvaldan sozlangan' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'Credential omboriga xavfsiz yozib bo‘lmadi' }, { status: 503 });
  }

  let created;
  try {
    created = db.createUser({
      name,
      email,
      role: 'USER',
      position,
      permissions: []
    });
  } catch {
    await removePasswordCredential(email, encodedHash).catch(() => undefined);
    return NextResponse.json({ error: 'Bu elektron pochta bilan hisob mavjud' }, { status: 409 });
  }

  db.addAuditLog({
    userId: actor.id,
    userName: actor.name,
    action: 'XODIM HISOBI YARATILDI',
    object: created.name,
    details: 'Oddiy xodim hisobi yaratildi; login elektron pochta orqali amalga oshadi',
    ip: 'unknown',
    status: 'SUCCESS'
  });

  return NextResponse.json({
    user: { id: created.id, name: created.name, email: created.email, role: created.role, position: created.position },
    message: 'Xodim hisobi yaratildi'
  }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
