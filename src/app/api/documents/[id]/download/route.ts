import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission(request, 'documents.view');
  if (isAuthResponse(user)) return user;
  const { id } = await params;
  const document = db.getDocument(id);
  if (!document) return NextResponse.json({ error: 'Hujjat topilmadi' }, { status: 404 });
  const allowed = user.role !== 'USER' ? true : document.projectId
    ? canAccessProject(user, db.getProject(document.projectId))
    : document.uploadedById === user.id;
  if (!allowed) return NextResponse.json({ error: 'Hujjatni yuklab olish taqiqlangan' }, { status: 403 });

  const root = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads'));
  const filePath = document.storagePath ? path.resolve(/*turbopackIgnore: true*/ root, document.storagePath) : '';
  if (!filePath || !filePath.startsWith(`${root}${path.sep}`) || !fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
    return NextResponse.json({ error: 'Saqlangan fayl mavjud emas' }, { status: 404 });
  }
  const types: Record<string, string> = {
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain; charset=utf-8', csv: 'text/csv; charset=utf-8'
  };
  const buffer = fs.readFileSync(/*turbopackIgnore: true*/ filePath);
  const filename = encodeURIComponent(path.basename(document.originalName || 'hujjat'));
  return new NextResponse(buffer, { headers: {
    'Content-Type': types[document.fileType] || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    'Content-Length': String(buffer.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff'
  } });
}
