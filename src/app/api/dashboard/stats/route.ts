import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isAuthResponse, requireUser } from '@/lib/auth';
import { canAccessProject, hasPermission } from '@/lib/policy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const user = await requireUser(request);
  if (isAuthResponse(user)) return user;
  const projects = db.getProjects().filter(project => canAccessProject(user, project));
  const projectIds = new Set(projects.map(project => project.id));
  const tasks = db.getTasks().filter(task => projectIds.has(task.projectId) && (user.role !== 'USER' || task.assigneeId === user.id || task.creatorId === user.id));
  const documents = db.getDocuments().filter(document => document.projectId ? projectIds.has(document.projectId) : user.role !== 'USER' || document.uploadedById === user.id);
  const knowledge = db.getKnowledge().filter(item => !item.projectId ? user.role !== 'USER' || item.ownerId === user.id : projectIds.has(item.projectId));
  const activeProjects = projects.filter(project => project.activityStatus === 'active' || project.status === 'Active').length;
  const completedProjects = projects.filter(project => project.activityStatus === 'completed' || project.status === 'Completed').length;
  const doneTasks = tasks.filter(task => task.status === 'DONE').length;
  const totalEstimatedBudget = projects.reduce((sum, p) => sum + (p.estimatedBudget || 0), 0);
  const tasksByStatus = {
    TODO: tasks.filter(task => task.status === 'TODO').length,
    IN_PROGRESS: tasks.filter(task => task.status === 'IN_PROGRESS').length,
    REVIEW: tasks.filter(task => task.status === 'REVIEW').length,
    DONE: doneTasks
  };
  const users = hasPermission(user, 'reports.view') ? db.getUsers() : [db.getUser(user.id)!];
  const teamWorkload = users.map(member => {
    const userTasks = tasks.filter(task => task.assigneeId === member.id);
    return { userId: member.id, name: member.name, role: member.role, position: member.position, totalTasks: userTasks.length, activeTasks: userTasks.filter(task => task.status !== 'DONE').length, completedTasks: userTasks.filter(task => task.status === 'DONE').length };
  });
  const logs = db.getAuditLogs().filter(log => hasPermission(user, 'audit.view') || log.userId === user.id).slice(0, 10);
  return NextResponse.json({
    kpis: {
      activeProjects, completedProjects, totalProjects: projects.length,
      pendingTasks: tasks.length - doneTasks, overdueTasks: tasks.filter(task => task.status !== 'DONE' && Date.parse(task.deadline) < Date.now()).length,
      doneTasks, totalDocuments: documents.length, totalKnowledgeItems: knowledge.length,
      totalMembers: hasPermission(user, 'team.view') ? db.getUsers().length : 1,
      totalEstimatedBudget
    },
    tasksByStatus, taskDistribution: tasksByStatus,
    projects: projects.map(project => ({
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      activityStatus: project.activityStatus,
      priority: project.priority,
      progressPercent: project.progressPercent,
      deadline: project.deadline,
      estimatedBudget: project.estimatedBudget,
      budgetCurrency: project.budgetCurrency
    })),
    teamWorkload, recentActivity: logs
  }, { headers: { 'Cache-Control': 'no-store' } });
}
