import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { canAccessProject } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: Request) {
  const user = await requirePermission(request, 'tasks.create');
  if (isAuthResponse(user)) return user;
  try {
    const body = await request.json();
    if (body?.actionType !== 'create_task') return NextResponse.json({ error: 'Bu amal turi qo‘llanmaydi' }, { status: 400 });
    if (body.confirmed !== true) return NextResponse.json({ error: 'Amal foydalanuvchi tomonidan tasdiqlanishi kerak' }, { status: 400 });
    const parameters = body.parameters && typeof body.parameters === 'object' ? body.parameters : {};
    const title = typeof parameters.title === 'string' ? parameters.title.trim() : '';
    let projectId = typeof parameters.projectId === 'string' ? parameters.projectId : '';
    let project = projectId ? db.getProject(projectId) : undefined;
    if (!project) {
      const allProjects = db.getProjects().filter(p => canAccessProject(user, p));
      if (allProjects.length > 0) {
        project = allProjects[0];
        projectId = project.id;
      }
    }
    if (!title || title.length > 240 || !project) return NextResponse.json({ error: 'Vazifa nomi yoki loyiha noto‘g‘ri' }, { status: 400 });
    if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
    const assigneeId = typeof parameters.assigneeId === 'string' ? parameters.assigneeId : '';
    if (assigneeId && assigneeId !== user.id && !user.permissions.includes('tasks.assign')) return NextResponse.json({ error: 'Boshqa xodimga biriktirish huquqi yo‘q' }, { status: 403 });
    const assignee = db.getUser(assigneeId || user.id);
    if (!assignee) return NextResponse.json({ error: 'Mas’ul shaxs topilmadi' }, { status: 400 });
    if (!project.teamIds.includes(assignee.id)) {
      db.updateProject(project.id, { teamIds: [...project.teamIds, assignee.id] });
      project = db.getProject(project.id) || project;
    }
    let deadline = typeof parameters.deadline === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parameters.deadline) ? parameters.deadline : '';
    if (!deadline || Number.isNaN(Date.parse(`${deadline}T00:00:00Z`))) {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      deadline = d.toISOString().slice(0, 10);
    }
    const task = db.createTask({
      title, description: typeof parameters.description === 'string' ? parameters.description.slice(0, 10000) : '',
      projectId: project.id, projectName: project.name, assigneeId: assignee.id, assigneeName: assignee.name,
      creatorId: user.id, creatorName: user.name, priority: ['Low', 'Medium', 'High', 'Critical'].includes(parameters.priority) ? parameters.priority : 'Medium',
      deadline, status: 'TODO', tags: []
    });
    db.addAuditLog({ userId: user.id, userName: user.name, action: 'AI TAKLIFIDAN VAZIFA YARATILDI', object: task.title, details: `Loyiha: ${project.name}`, ip: 'unknown', status: 'SUCCESS' });
    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'AI amali bajarilmadi' }, { status: 400 });
  }
}
