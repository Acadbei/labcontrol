import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';
import { Priority, ProjectStatus, ProjectActivityStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const STATUSES: ProjectStatus[] = ['Planning', 'Active', 'On Hold', 'Testing', 'Completed', 'Archived'];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
const ACTIVITY_STATUSES: ProjectActivityStatus[] = ['active', 'inactive', 'pending', 'completed', 'suspended'];

export async function GET(request: Request) {
  const user = await requirePermission(request, 'projects.view');
  if (isAuthResponse(user)) return user;
  const projects = db.getProjects().filter(project => canAccessProject(user, project)).map(project => ({
    ...project,
    documentsCount: db.getDocuments(project.id).length,
    tasksCount: db.getTasks(project.id).length
  }));
  return NextResponse.json(projects, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "So'rov formati noto'g'ri" }, { status: 400 }); }
  if (['assign_member', 'remove_member', 'attach_document', 'detach_document'].includes(body?.action)) {
    const user = await requirePermission(request, 'projects.edit');
    if (isAuthResponse(user)) return user;
    const project = typeof body.projectId === 'string' ? db.getProject(body.projectId) : undefined;
    if (!project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
    let success = false;
    if (body.action === 'assign_member' || body.action === 'remove_member') {
      if (typeof body.userId !== 'string' || !db.getUser(body.userId)) return NextResponse.json({ error: 'Xodim topilmadi' }, { status: 400 });
      success = body.action === 'assign_member' ? db.assignTeamMemberToProject(project.id, body.userId) : db.removeTeamMemberFromProject(project.id, body.userId);
    } else {
      const document = typeof body.docId === 'string' ? db.getDocument(body.docId) : undefined;
      if (!document) return NextResponse.json({ error: 'Hujjat topilmadi' }, { status: 404 });
      if (body.action === 'attach_document') {
        if (document.projectId && !canAccessProject(user, db.getProject(document.projectId))) return NextResponse.json({ error: 'Manba loyihasiga kirish taqiqlangan' }, { status: 403 });
        success = db.attachDocumentToProject(document.id, project.id);
      } else {
        if (document.projectId !== project.id) return NextResponse.json({ error: 'Hujjat ushbu loyihaga biriktirilmagan' }, { status: 400 });
        success = db.detachDocumentFromProject(document.id);
      }
    }
    if (success) db.addAuditLog({ userId: user.id, userName: user.name, action: "LOYIHA ALOQASI YANGILANDI", object: project.name, details: "Loyiha a'zosi yoki hujjat aloqasi o'zgartirildi", ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json({ success, project: db.getProject(project.id) });
  }

  const user = await requirePermission(request, 'projects.create');
  if (isAuthResponse(user)) return user;
  try {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const code = typeof body?.code === 'string' ? body.code.trim().toUpperCase() : '';
    if (!name || name.length > 160 || !/^[A-Z0-9][A-Z0-9_-]{1,31}$/.test(code)) return NextResponse.json({ error: "Loyiha nomi yoki kodi noto'g'ri" }, { status: 400 });
    if (db.getProjects().some(project => project.code.toUpperCase() === code)) return NextResponse.json({ error: 'Bu loyiha kodi avvaldan mavjud' }, { status: 409 });
    const teamIds = Array.isArray(body.teamIds) ? body.teamIds : [user.id];
    if (!teamIds.every((id: unknown) => typeof id === 'string' && db.getUser(id))) return NextResponse.json({ error: "Jamoada noma'lum xodim bor" }, { status: 400 });
    const description = typeof body.description === 'string' ? body.description.trim().slice(0, 10000) : '';
    const priority = PRIORITIES.includes(body.priority) ? body.priority : 'Medium';
    const deadline = typeof body.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const estimatedBudget = typeof body.estimatedBudget === 'number' && body.estimatedBudget >= 0 ? body.estimatedBudget : undefined;
    const budgetCurrency = typeof body.budgetCurrency === 'string' ? body.budgetCurrency.slice(0, 10) : 'UZS';
    const activityStatus: ProjectActivityStatus = ACTIVITY_STATUSES.includes(body.activityStatus) ? body.activityStatus : 'pending';
    const progressPercent = typeof body.progressPercent === 'number' && body.progressPercent >= 0 && body.progressPercent <= 100 ? Math.round(body.progressPercent) : 0;
    const technicalParameters = Array.isArray(body.technicalParameters) ? body.technicalParameters : [];
    const status: ProjectStatus = body.status && STATUSES.includes(body.status)
      ? body.status
      : (activityStatus === 'active' ? 'Active' : activityStatus === 'completed' ? 'Completed' : 'Planning');
    const project = db.createProject({
      name, code, description, status, priority, startDate: new Date().toISOString().slice(0, 10), deadline,
      managerId: user.id, teamIds: [...new Set([...teamIds, user.id])], documentsCount: 0, tasksCount: 0,
      progressPercent, technicalParameters, overview: description, decisions: [], tags: [code],
      estimatedBudget, budgetCurrency, activityStatus
    });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'LOYIHA YARATILDI', object: project.name, details: `Yangi loyiha kodi: ${project.code}`, ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(project, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Loyiha yaratilmadi' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await requirePermission(request, 'projects.edit');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    const current = db.getProject(id);
    if (!current) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
    if (!canAccessProject(user, current)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
    const allowed = new Set(['id', 'name', 'code', 'description', 'status', 'activityStatus', 'priority', 'deadline', 'teamIds', 'progressPercent', 'overview', 'tags', 'estimatedBudget', 'budgetCurrency', 'technicalParameters']);
    if (Object.keys(body).some(key => !allowed.has(key))) return NextResponse.json({ error: 'Ruxsat etilmagan maydon yuborildi' }, { status: 400 });
    const updates: Record<string, any> = {};
    if (body.name !== undefined) { if (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 160) return NextResponse.json({ error: "Loyiha nomi noto'g'ri" }, { status: 400 }); updates.name = body.name.trim(); }
    if (body.code !== undefined) { if (typeof body.code !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{1,31}$/.test(body.code)) return NextResponse.json({ error: "Loyiha kodi noto'g'ri" }, { status: 400 }); updates.code = body.code.toUpperCase(); }
    if (body.description !== undefined) { if (typeof body.description !== 'string' || body.description.length > 10000) return NextResponse.json({ error: "Tavsif hajmi noto'g'ri" }, { status: 400 }); updates.description = body.description.trim(); }
    if (body.status !== undefined) { if (!STATUSES.includes(body.status)) return NextResponse.json({ error: "Loyiha holati noto'g'ri" }, { status: 400 }); updates.status = body.status; }
    if (body.activityStatus !== undefined) {
      if (!ACTIVITY_STATUSES.includes(body.activityStatus)) return NextResponse.json({ error: "Faollik holati noto'g'ri" }, { status: 400 });
      updates.activityStatus = body.activityStatus;
      if (body.status === undefined) {
        if (body.activityStatus === 'active') updates.status = 'Active';
        else if (body.activityStatus === 'completed') updates.status = 'Completed';
      }
    }
    if (body.priority !== undefined) { if (!PRIORITIES.includes(body.priority)) return NextResponse.json({ error: "Ustuvorlik noto'g'ri" }, { status: 400 }); updates.priority = body.priority; }
    if (body.deadline !== undefined) { if (typeof body.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline)) return NextResponse.json({ error: "Muddat noto'g'ri" }, { status: 400 }); updates.deadline = body.deadline; }
    if (body.teamIds !== undefined) { if (!Array.isArray(body.teamIds) || !body.teamIds.every((id: unknown) => typeof id === 'string' && db.getUser(id))) return NextResponse.json({ error: "Jamoa ro'yxati noto'g'ri" }, { status: 400 }); updates.teamIds = [...new Set(body.teamIds)]; }
    if (body.progressPercent !== undefined) { if (!Number.isInteger(body.progressPercent) || body.progressPercent < 0 || body.progressPercent > 100) return NextResponse.json({ error: 'Jarayon foizi 0-100 oraligida bolishi kerak' }, { status: 400 }); updates.progressPercent = body.progressPercent; }
    if (body.overview !== undefined) { if (typeof body.overview !== 'string' || body.overview.length > 10000) return NextResponse.json({ error: "Loyiha sharhi noto'g'ri" }, { status: 400 }); updates.overview = body.overview; }
    if (body.tags !== undefined) { if (!Array.isArray(body.tags) || !body.tags.every((tag: unknown) => typeof tag === 'string')) return NextResponse.json({ error: "Teglar noto'g'ri" }, { status: 400 }); updates.tags = body.tags.slice(0, 20).map((tag: string) => tag.slice(0, 60)); }
    if (body.estimatedBudget !== undefined) { if (body.estimatedBudget !== null && (typeof body.estimatedBudget !== 'number' || body.estimatedBudget < 0)) return NextResponse.json({ error: "Taxminiy mablag' noto'g'ri" }, { status: 400 }); updates.estimatedBudget = body.estimatedBudget ?? undefined; }
    if (body.budgetCurrency !== undefined) { updates.budgetCurrency = typeof body.budgetCurrency === 'string' ? body.budgetCurrency.slice(0, 10) : 'UZS'; }
    if (body.technicalParameters !== undefined) { if (!Array.isArray(body.technicalParameters)) return NextResponse.json({ error: "Texnik parametrlar noto'g'ri" }, { status: 400 }); updates.technicalParameters = body.technicalParameters; }
    const updated = db.updateProject(id, updates);
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'LOYIHA TAHRIRLANDI', object: updated?.name || id, details: 'Loyiha ruxsatli maydonlari yangilandi', ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Loyiha yangilanmadi' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requirePermission(request, 'projects.delete');
  if (isAuthResponse(user)) return user;
  const id = new URL(request.url).searchParams.get('id');
  const project = id ? db.getProject(id) : undefined;
  if (!project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
  if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
  if (db.getTasks(project.id).length || db.getDocuments(project.id).length) return NextResponse.json({ error: "Avval loyiha vazifalari va hujjatlarini ko'chiring yoki o'chiring" }, { status: 409 });
  db.deleteProject(project.id);
  db.addAuditLog({ userId: user.id, userName: user.name, action: "LOYIHA O'CHIRILDI", object: project.name, details: "Bo'sh loyiha o'chirildi", ip: 'unknown', status: 'WARNING' });
  return NextResponse.json({ success: true });
}
