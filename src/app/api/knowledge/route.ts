import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';
import { KnowledgeItem } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const CATEGORIES = ['Standard', 'Specification', 'Hardware', 'Software', 'CAD/3D', 'Research'] as const;

export async function GET(request: Request) {
  const user = await requirePermission(request, 'knowledge.view');
  if (isAuthResponse(user)) return user;
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;
  if (projectId && !canAccessProject(user, db.getProject(projectId))) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
  let items = db.getKnowledge(projectId).filter(item => user.role !== 'USER' || item.ownerId === user.id || canAccessProject(user, db.getProject(item.projectId || '')));
  const query = (searchParams.get('q') || '').trim().toLowerCase();
  if (query) items = items.filter(item => item.title.toLowerCase().includes(query) || item.content.toLowerCase().includes(query) || item.tags.some(tag => tag.toLowerCase().includes(query)));
  return NextResponse.json(items, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'knowledge.create');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';
    if (!title || title.length > 240 || !content || content.length > 50000) return NextResponse.json({ error: 'Sarlavha va matn hajmi yaroqsiz' }, { status: 400 });
    const category = CATEGORIES.includes(body.category) ? body.category : null;
    if (!category) return NextResponse.json({ error: 'Bilim toifasi noto‘g‘ri' }, { status: 400 });
    const projectId = typeof body.projectId === 'string' ? body.projectId : '';
    const project = projectId ? db.getProject(projectId) : undefined;
    if (projectId && !project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 400 });
    if (projectId && !canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
    const tags = Array.isArray(body.tags) && body.tags.every((tag: unknown) => typeof tag === 'string') ? body.tags.slice(0, 20).map((tag: string) => tag.slice(0, 60)) : [];
    const technicalParams = Array.isArray(body.technicalParams) ? body.technicalParams.filter((item: any) => item && typeof item.key === 'string' && typeof item.value === 'string').slice(0, 100) : [];
    const item = db.addKnowledge({ title, category, content, projectId: project?.id, projectName: project?.name, technicalParams, tags, ownerId: user.id });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'BILIM QO‘SHILDI', object: item.title, details: 'Bilim yozuvi yaratildi', ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(item, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Bilim yozuvi yaratilmadi' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await requirePermission(request, 'knowledge.edit');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const item = db.getKnowledge().find(value => value.id === id);
    if (!item) return NextResponse.json({ error: 'Bilim yozuvi topilmadi' }, { status: 404 });
    if (item.projectId && !canAccessProject(user, db.getProject(item.projectId))) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });

    const allowed = new Set(['id', 'title', 'category', 'content', 'projectId', 'technicalParams', 'tags']);
    if (Object.keys(body).some(key => !allowed.has(key))) return NextResponse.json({ error: 'Ruxsat etilmagan maydon yuborildi' }, { status: 400 });
    const updates: Partial<KnowledgeItem> = {};
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 240) return NextResponse.json({ error: 'Sarlavha noto‘g‘ri' }, { status: 400 });
      updates.title = body.title.trim();
    }
    if (body.content !== undefined) {
      if (typeof body.content !== 'string' || !body.content.trim() || body.content.length > 50000) return NextResponse.json({ error: 'Matn hajmi yaroqsiz' }, { status: 400 });
      updates.content = body.content.trim();
    }
    if (body.category !== undefined) {
      if (!CATEGORIES.includes(body.category)) return NextResponse.json({ error: 'Bilim toifasi noto‘g‘ri' }, { status: 400 });
      updates.category = body.category;
    }
    if (Object.hasOwn(body, 'projectId')) {
      const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : body.projectId === null ? '' : undefined;
      if (projectId === undefined) return NextResponse.json({ error: 'Loyiha ID noto‘g‘ri' }, { status: 400 });
      if (projectId) {
        const project = db.getProject(projectId);
        if (!project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 400 });
        if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
        updates.projectId = project.id;
        updates.projectName = project.name;
      } else {
        updates.projectId = undefined;
        updates.projectName = undefined;
      }
    }
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || !body.tags.every((tag: unknown) => typeof tag === 'string')) return NextResponse.json({ error: 'Teglar ro‘yxati noto‘g‘ri' }, { status: 400 });
      updates.tags = body.tags.slice(0, 20).map((tag: string) => tag.slice(0, 60));
    }
    if (body.technicalParams !== undefined) {
      if (!Array.isArray(body.technicalParams)) return NextResponse.json({ error: 'Texnik parametrlar noto‘g‘ri' }, { status: 400 });
      updates.technicalParams = body.technicalParams.filter((value: any) => value && typeof value.key === 'string' && typeof value.value === 'string').slice(0, 100);
    }

    const updated = db.updateKnowledge(id, updates);
    if (!updated) return NextResponse.json({ error: 'Bilim yozuvi topilmadi' }, { status: 404 });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'BILIM TAHRIRLANDI', object: updated.title, details: 'Bilim yozuvining ruxsatli maydonlari yangilandi', ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Bilim yozuvi yangilanmadi' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requirePermission(request, 'knowledge.delete');
  if (isAuthResponse(user)) return user;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Bilim yozuvi ID talab qilinadi' }, { status: 400 });
  const item = db.getKnowledge().find(value => value.id === id);
  if (!item) return NextResponse.json({ error: 'Bilim yozuvi topilmadi' }, { status: 404 });
  if (item.projectId && !canAccessProject(user, db.getProject(item.projectId))) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
  if (!db.deleteKnowledge(id)) return NextResponse.json({ error: 'Bilim yozuvi topilmadi' }, { status: 404 });
  db.addAuditLog({ userId: user.id, userName: user.name, action: 'BILIM O‘CHIRILDI', object: item.title, details: 'Bilim yozuvi o‘chirildi', ip: 'unknown', status: 'WARNING' });
  return NextResponse.json({ success: true });
}
