import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requireUser } from '@/lib/auth';
import { canAccessProject, hasPermission } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isAuthResponse(user)) return user;
  const query = (new URL(request.url).searchParams.get('q') || '').trim().toLocaleLowerCase('uz');
  if (query.length < 2 || query.length > 200) return NextResponse.json({ results: [] });
  const results: any[] = [];

  if (hasPermission(user, 'projects.view')) for (const project of db.getProjects().filter(item => canAccessProject(user, item))) {
    const text = `${project.name} ${project.code} ${project.description} ${(project.tags || []).join(' ')}`.toLocaleLowerCase('uz');
    if (text.includes(query)) results.push({ id: project.id, entityType: 'project', typeLabel: 'Loyiha', title: `${project.code} — ${project.name}`, subtitle: project.description.slice(0, 100), badge: project.status, meta: `Muddat: ${project.deadline}`, targetTab: 'projects', data: project });
  }
  if (hasPermission(user, 'documents.view')) for (const document of db.getDocuments().filter(item => item.projectId ? canAccessProject(user, db.getProject(item.projectId)) : user.role !== 'USER' || item.uploadedById === user.id)) {
    const text = `${document.title} ${document.originalName} ${document.summary} ${(document.tags || []).join(' ')}`.toLocaleLowerCase('uz');
    if (text.includes(query)) {
      const { storagePath: _storagePath, ...safeDocument } = document;
      results.push({ id: document.id, entityType: 'document', typeLabel: 'Hujjat', title: document.title, subtitle: document.summary.slice(0, 110), badge: document.fileType.toUpperCase(), meta: `${document.chunksCount} ta ajratilgan parcha`, targetTab: 'documents', data: safeDocument });
    }
  }
  if (hasPermission(user, 'tasks.view')) for (const task of db.getTasks().filter(item => item.projectId && canAccessProject(user, db.getProject(item.projectId)) && (user.role !== 'USER' || item.assigneeId === user.id || item.creatorId === user.id))) {
    const text = `${task.title} ${task.description} ${task.tags.join(' ')}`.toLocaleLowerCase('uz');
    if (text.includes(query)) results.push({ id: task.id, entityType: 'task', typeLabel: 'Vazifa', title: task.title, subtitle: task.description.slice(0, 100), badge: task.status, meta: `Muddat: ${task.deadline}`, targetTab: 'tasks', data: task });
  }
  if (hasPermission(user, 'knowledge.view')) for (const item of db.getKnowledge().filter(value => value.projectId ? canAccessProject(user, db.getProject(value.projectId)) : user.role !== 'USER' || value.ownerId === user.id)) {
    if (`${item.title} ${item.category} ${item.content} ${item.tags.join(' ')}`.toLocaleLowerCase('uz').includes(query)) results.push({ id: item.id, entityType: 'knowledge', typeLabel: 'Bilimlar bazasi', title: item.title, subtitle: item.content.slice(0, 110), badge: item.category, meta: `Yangilangan: ${new Date(item.updatedAt).toLocaleDateString('uz-UZ')}`, targetTab: 'knowledge', data: item });
  }
  return NextResponse.json({ query, count: results.length, results: results.slice(0, 20) }, { headers: { 'Cache-Control': 'no-store' } });
}
