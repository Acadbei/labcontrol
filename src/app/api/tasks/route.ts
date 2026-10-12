import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';
import { Priority, TaskStatus } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
const STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Critical'];
const NEXT_STATES: Record<TaskStatus, TaskStatus[]> = { TODO: ['IN_PROGRESS'], IN_PROGRESS: ['TODO', 'REVIEW'], REVIEW: ['IN_PROGRESS', 'DONE'], DONE: [] };

function taskInScope(user: { role: string; id: string }, task: { projectId: string; assigneeId: string; creatorId: string }) {
  if (user.role !== 'USER') return true;
  return canAccessProject(user as any, db.getProject(task.projectId)) && (task.assigneeId === user.id || task.creatorId === user.id);
}

export async function GET(request: Request) {
  const user = await requirePermission(request, 'tasks.view');
  if (isAuthResponse(user)) return user;
  const { searchParams } = new URL(request.url);
  const requestedProject = searchParams.get('projectId') || undefined;
  const requestedAssignee = searchParams.get('assigneeId') || undefined;
  if (requestedProject && !canAccessProject(user, db.getProject(requestedProject))) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
  let tasks = db.getTasks(requestedProject, requestedAssignee);
  if (user.role === 'USER') tasks = tasks.filter(task => taskInScope(user, task));
  return NextResponse.json(tasks, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'tasks.create');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const title = typeof body?.title === 'string' ? body.title.trim() : '';
    if (!title || title.length > 240) return NextResponse.json({ error: 'Vazifa sarlavhasi 1–240 belgi bo‘lishi kerak' }, { status: 400 });
    
    let projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    let project = projectId ? db.getProject(projectId) : undefined;
    if (!project) {
      const allProjects = db.getProjects().filter(p => canAccessProject(user, p));
      if (allProjects.length > 0) {
        project = allProjects[0];
        projectId = project.id;
      }
    }
    if (!project) return NextResponse.json({ error: 'Loyiha topilmadi yoki tanlanmagan' }, { status: 400 });
    if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });

    const assigneeId = typeof body.assigneeId === 'string' && body.assigneeId ? body.assigneeId : user.id;
    if (assigneeId !== user.id && !user.permissions.includes('tasks.assign')) return NextResponse.json({ error: 'Vazifa biriktirish huquqi yo‘q' }, { status: 403 });
    const assignee = db.getUser(assigneeId);
    if (!assignee) return NextResponse.json({ error: 'Mas’ul xodim topilmadi' }, { status: 400 });
    if (!project.teamIds.includes(assigneeId)) {
      db.updateProject(project.id, { teamIds: [...project.teamIds, assigneeId] });
      project = db.getProject(project.id) || project;
    }

    const priority = PRIORITIES.includes(body.priority) ? body.priority : 'Medium';
    let deadline = typeof body.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.deadline) ? body.deadline : '';
    if (!deadline || Number.isNaN(Date.parse(`${deadline}T00:00:00Z`))) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      deadline = d.toISOString().slice(0, 10);
    }

    const task = db.createTask({
      title, description: typeof body.description === 'string' ? body.description.trim().slice(0, 10000) : '',
      projectId: project.id, projectName: project.name, assigneeId, assigneeName: assignee.name,
      creatorId: user.id, creatorName: user.name, priority: priority as Priority, deadline,
      status: 'TODO', tags: Array.isArray(body.tags) ? body.tags.filter((item: unknown) => typeof item === 'string').slice(0, 20) : []
    });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'VAZIFA YARATILDI', object: task.title, details: `Loyiha: ${project.name}`, ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Vazifa yaratilmadi' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  const user = await requirePermission(request, 'tasks.edit');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    const id = typeof body?.id === 'string' ? body.id : '';
    if (!id) return NextResponse.json({ error: 'Vazifa ID talab qilinadi' }, { status: 400 });
    const existing = db.getTask(id);
    if (!existing) return NextResponse.json({ error: 'Vazifa topilmadi' }, { status: 404 });
    if (!taskInScope(user, existing)) return NextResponse.json({ error: 'Vazifaga kirish taqiqlangan' }, { status: 403 });
    const allowedKeys = user.role === 'USER' ? new Set(['id', 'status', 'comment']) : new Set(['id', 'status', 'comment', 'title', 'description', 'priority', 'deadline', 'assigneeId', 'tags']);
    if (Object.keys(body).some(key => !allowedKeys.has(key))) return NextResponse.json({ error: 'Ruxsat etilmagan maydon yuborildi' }, { status: 400 });
    const changes: Record<string, any> = {};
    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) return NextResponse.json({ error: 'Vazifa holati noto‘g‘ri' }, { status: 400 });
      if (body.status !== existing.status && !NEXT_STATES[existing.status].includes(body.status)) return NextResponse.json({ error: 'Holat o‘tishi ruxsat etilmagan' }, { status: 409 });
      changes.status = body.status;
    }
    if (body.comment !== undefined) {
      if (typeof body.comment !== 'string' || body.comment.trim().length > 2000) return NextResponse.json({ error: 'Izoh 2000 belgidan oshmasin' }, { status: 400 });
      if (body.comment.trim()) changes.comments = [...existing.comments, { id: `comment-${randomUUID()}`, userId: user.id, userName: user.name, text: body.comment.trim(), createdAt: new Date().toISOString() }];
    }
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim() || body.title.length > 240) return NextResponse.json({ error: 'Sarlavha noto‘g‘ri' }, { status: 400 });
      changes.title = body.title.trim();
    }
    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || body.description.length > 10000) return NextResponse.json({ error: 'Tavsif hajmi noto‘g‘ri' }, { status: 400 });
      changes.description = body.description.trim();
    }
    if (body.priority !== undefined) {
      if (!PRIORITIES.includes(body.priority)) return NextResponse.json({ error: 'Ustuvorlik noto‘g‘ri' }, { status: 400 });
      changes.priority = body.priority;
    }
    if (body.deadline !== undefined) {
      if (typeof body.deadline !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.deadline) || Number.isNaN(Date.parse(`${body.deadline}T00:00:00Z`))) return NextResponse.json({ error: 'Muddat noto‘g‘ri' }, { status: 400 });
      changes.deadline = body.deadline;
    }
    if (body.assigneeId !== undefined) {
      if (!user.permissions.includes('tasks.assign')) return NextResponse.json({ error: 'Vazifa biriktirish huquqi yo‘q' }, { status: 403 });
      const assignee = typeof body.assigneeId === 'string' ? db.getUser(body.assigneeId) : undefined;
      const project = db.getProject(existing.projectId);
      if (!assignee) return NextResponse.json({ error: 'Mas’ul shaxs topilmadi' }, { status: 400 });
      if (project && !project.teamIds.includes(assignee.id)) {
        db.updateProject(project.id, { teamIds: [...project.teamIds, assignee.id] });
      }
      changes.assigneeId = assignee.id; changes.assigneeName = assignee.name;
    }
    if (body.tags !== undefined) {
      if (!Array.isArray(body.tags) || !body.tags.every((tag: unknown) => typeof tag === 'string')) return NextResponse.json({ error: 'Teglar ro‘yxati noto‘g‘ri' }, { status: 400 });
      changes.tags = body.tags.slice(0, 20).map((tag: string) => tag.slice(0, 60));
    }
    const updated = db.updateTask(id, changes);
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'VAZIFA YANGILANDI', object: existing.title, details: body.status ? `Holat: ${body.status}` : 'Ruxsatli maydonlar yangilandi', ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Vazifa yangilanmadi' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await requirePermission(request, 'tasks.delete');
  if (isAuthResponse(user)) return user;
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Vazifa ID talab qilinadi' }, { status: 400 });
  const existing = db.getTask(id);
  if (!existing) return NextResponse.json({ error: 'Vazifa topilmadi' }, { status: 404 });
  if (!taskInScope(user, existing)) return NextResponse.json({ error: 'Vazifaga kirish taqiqlangan' }, { status: 403 });
  db.deleteTask(id);
  db.addAuditLog({ userId: user.id, userName: user.name, action: 'VAZIFA O‘CHIRILDI', object: existing.title, details: 'Vazifa o‘chirildi', ip: 'unknown', status: 'WARNING' });
  return NextResponse.json({ success: true });
}
