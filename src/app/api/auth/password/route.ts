import { NextResponse } from 'next/server';
import { changeOwnPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request: Request) {
  let body: any;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'So‘rov formati noto‘g‘ri' }, { status: 400 }); }

  return changeOwnPassword(
    request,
    typeof body?.currentPassword === 'string' ? body.currentPassword : '',
    typeof body?.newPassword === 'string' ? body.newPassword : ''
  );
}

export async function POST() {
  return NextResponse.json({ error: 'PUT usulidan foydalaning' }, { status: 405 });
}
