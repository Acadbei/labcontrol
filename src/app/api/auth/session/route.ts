import { NextResponse } from 'next/server';
import { requireUser, isAuthResponse, publicUserList } from '@/lib/auth';
import { hasPermission } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isAuthResponse(user)) return user;
  return NextResponse.json({
    user,
    team: hasPermission(user, 'team.view') ? publicUserList(hasPermission(user, 'team.contact.view')) : [],
    demoMode: process.env.LABCONTROL_DEMO_MODE === 'true'
  }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  return NextResponse.json({ error: 'Profil almashtirish endpoint’i o‘chirilgan' }, { status: 405 });
}
