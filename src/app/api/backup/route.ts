import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { hasPermission } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const user = await requirePermission(request, 'backup.export');
  if (isAuthResponse(user)) return user;
  const filename = `labcontrol-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const body = JSON.stringify(db.getBackupSnapshot(hasPermission(user, 'team.contact.view')), null, 2);
  const response = new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store, private'
    }
  });
  // The snapshot is serialized first; the audit event records the completed export operation.
  db.addAuditLog({ userId: user.id, userName: user.name, action: 'ZAXIRA NUSXA EKSPORT QILINDI', object: filename, details: 'Zaxira nusxasi shakllantirildi', ip: 'unknown', status: 'SUCCESS' });
  return response;
}

export async function GET() {
  return NextResponse.json({ error: 'Zaxira eksporti POST orqali bajariladi' }, { status: 405, headers: { Allow: 'POST' } });
}
