import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function inScope(user: { role: string; id: string }, document: { projectId?: string; uploadedById: string }) {
  return user.role !== 'USER' ? true : document.projectId
    ? canAccessProject(user as any, db.getProject(document.projectId))
    : document.uploadedById === user.id;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(request, 'documents.view');
  if (isAuthResponse(user)) return user;
  const { id } = await params;
  const document = db.getDocument(id);
  if (!document) return NextResponse.json({ error: 'Hujjat topilmadi' }, { status: 404 });
  if (!inScope(user, document)) return NextResponse.json({ error: 'Hujjatga kirish taqiqlangan' }, { status: 403 });
  return NextResponse.json({ document, chunks: db.getChunks(id) }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(request, 'documents.verify');
  if (isAuthResponse(user)) return user;
  const { id } = await params;
  const document = db.getDocument(id);
  if (!document) return NextResponse.json({ error: 'Hujjat topilmadi' }, { status: 404 });
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'So‘rov formati noto‘g‘ri' }, { status: 400 }); }
  if (typeof body?.verified !== 'boolean' || typeof body?.provenance !== 'string' || body.provenance.trim().length < 8 || body.provenance.length > 1000) {
    return NextResponse.json({ error: 'Tasdiqlash holati va kamida 8 belgili tekshirish manbasi talab qilinadi' }, { status: 400 });
  }
  if (body.verified && (!document.isIndexed || db.getChunks(document.id).length === 0)) {
    return NextResponse.json({ error: 'Matni ajratilmagan hujjatni manba sifatida tasdiqlab bo‘lmaydi' }, { status: 409 });
  }
  const updated = db.updateDocument(document.id, {
    verified: body.verified,
    provenance: body.provenance.trim(),
    verifiedById: user.id,
    verifiedByName: user.name,
    verifiedAt: new Date().toISOString()
  });
  db.addAuditLog({ userId: user.id, userName: user.name, action: body.verified ? 'HUJJAT MANBAI TASDIQLANDI' : 'HUJJAT TASDIQI BEKOR QILINDI', object: document.originalName, details: `Tekshirish qaydi: ${body.provenance.trim()}`, ip: 'unknown', status: body.verified ? 'SUCCESS' : 'WARNING' });
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(request, 'documents.delete');
  if (isAuthResponse(user)) return user;
  const { id } = await params;
  const document = db.getDocument(id);
  if (!document) return NextResponse.json({ error: 'Hujjat topilmadi' }, { status: 404 });
  if (!inScope(user, document)) return NextResponse.json({ error: 'Hujjatga kirish taqiqlangan' }, { status: 403 });
  if (document.storagePath) {
    const root = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads'));
    const target = path.resolve(/*turbopackIgnore: true*/ root, document.storagePath);
    if (target.startsWith(`${root}${path.sep}`) && fs.existsSync(/*turbopackIgnore: true*/ target)) fs.unlinkSync(/*turbopackIgnore: true*/ target);
  }
  db.deleteDocument(id);
  db.addAuditLog({ userId: user.id, userName: user.name, action: 'HUJJAT O‘CHIRILDI', object: document.originalName, details: 'Hujjat va unga tegishli parchalar o‘chirildi', ip: 'unknown', status: 'WARNING' });
  return NextResponse.json({ success: true });
}
