import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requirePermission(request, 'audit.view');
  if (isAuthResponse(user)) return user;
  return NextResponse.json(db.getAuditLogs(), { headers: { 'Cache-Control': 'no-store' } });
}
