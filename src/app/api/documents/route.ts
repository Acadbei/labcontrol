import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { db } from '@/lib/db';
import { parseDocumentFile } from '@/lib/documents/parser';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';
import { DocumentChunk, DocumentEntity, SupportedFileType } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const ALLOWED_TYPES: Record<string, SupportedFileType> = {
  '.pdf': 'pdf', '.docx': 'docx', '.pptx': 'pptx',
  '.txt': 'txt', '.md': 'txt', '.csv': 'csv'
};
const MAX_FILE_SIZE = 25 * 1024 * 1024;

function signatureMatches(ext: string, buffer: Buffer): boolean {
  if (ext === '.pdf') return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  if (['.docx', '.pptx'].includes(ext)) return buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
  try { new TextDecoder('utf-8', { fatal: true }).decode(buffer); return !buffer.includes(0); } catch { return false; }
}

export async function GET(request: Request) {
  const user = await requirePermission(request, 'documents.view');
  if (isAuthResponse(user)) return user;
  const projectId = new URL(request.url).searchParams.get('projectId') || undefined;
  const project = projectId ? db.getProject(projectId) : undefined;
  if (projectId && !project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
  if (projectId && !canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
  const documents = db.getDocuments(projectId).filter(document => user.role !== 'USER' ||
    (document.projectId ? canAccessProject(user, db.getProject(document.projectId)) : document.uploadedById === user.id));
  return NextResponse.json(documents, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'documents.upload');
  if (isAuthResponse(user)) return user;
  let savedPath: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Fayl tanlanmagan' }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Fayl hajmi 1 baytdan 25 MB gacha bo‘lishi kerak' }, { status: 400 });
    const ext = path.extname(file.name).toLowerCase();
    const fileType = ALLOWED_TYPES[ext];
    if (!fileType) return NextResponse.json({ error: 'Hozir PDF, DOCX, PPTX, TXT, MD va CSV turlari qo‘llanadi' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!signatureMatches(ext, buffer)) return NextResponse.json({ error: 'Fayl mazmuni tanlangan turga mos emas' }, { status: 400 });

    const requestedProjectId = form.get('projectId');
    const projectId = typeof requestedProjectId === 'string' && requestedProjectId ? requestedProjectId : undefined;
    const project = projectId ? db.getProject(projectId) : undefined;
    if (projectId && !project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 400 });
    if (projectId && !canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });

    const uploadsDir = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_UPLOADS_DIR || path.join(process.cwd(), 'data', 'uploads'));
    fs.mkdirSync(/*turbopackIgnore: true*/ uploadsDir, { recursive: true });
    const docId = `doc-${randomUUID()}`;
    const fileName = `${docId}${ext}`;
    savedPath = path.join(uploadsDir, fileName);
    fs.writeFileSync(/*turbopackIgnore: true*/ savedPath, buffer, { flag: 'wx', mode: 0o600 });

    const parsed = await parseDocumentFile(savedPath, path.basename(file.name), fileType);
    const titleValue = form.get('title');
    const title = typeof titleValue === 'string' && titleValue.trim() ? titleValue.trim().slice(0, 240) : path.basename(file.name).slice(0, 240);
    const document: DocumentEntity = {
      id: docId, title, originalName: path.basename(file.name), fileType, fileSize: file.size,
      storagePath: fileName, projectId: project?.id, projectName: project?.name,
      uploadedById: user.id, uploadedByName: user.name, uploadedAt: new Date().toISOString(), version: 1,
      summary: parsed.summary, tags: parsed.tags, technicalParameters: parsed.technicalParameters,
      pageCount: parsed.pageCount, slideCount: parsed.slideCount, wordCount: parsed.wordCount,
      isIndexed: parsed.chunks.length > 0, chunksCount: parsed.chunks.length,
      verified: false, provenance: 'yuklangan; mazmuni hali tasdiqlanmagan'
    };
    const chunks: DocumentChunk[] = parsed.chunks.map((chunk, index) => ({ ...chunk, id: `${docId}-chunk-${index + 1}`, docId }));
    db.addDocument(document, chunks);
    if (project) db.updateProject(project.id, { documentsCount: db.getDocuments(project.id).length });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'HUJJAT YUKLANDI', object: document.originalName, details: `Matn ajratildi: ${parsed.wordCount} so‘z; indeks holati: ${document.isIndexed ? 'mavjud' : 'bo‘sh'}`, ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json({ success: true, document }, { status: 201 });
  } catch (error: any) {
    if (savedPath && fs.existsSync(/*turbopackIgnore: true*/ savedPath)) { try { fs.unlinkSync(/*turbopackIgnore: true*/ savedPath); } catch { /* Cleanup is best effort. */ } }
    return NextResponse.json({ error: error?.message || 'Faylni qabul qilib bo‘lmadi' }, { status: 400 });
  }
}
