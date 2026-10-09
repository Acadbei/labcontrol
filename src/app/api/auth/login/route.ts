import { NextResponse } from 'next/server';
import { loginWithPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'So‘rov formati noto‘g‘ri' }, { status: 400 });
  }
  return loginWithPassword(request, body?.identifier ?? body?.email, body?.password);
}
