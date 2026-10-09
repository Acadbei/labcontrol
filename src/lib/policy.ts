import { Permission, Project, User, UserRole } from '@/types';

export const ALL_PERMISSIONS: Permission[] = [
  'users.view', 'users.create', 'users.edit', 'users.delete',
  'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
  'documents.view', 'documents.upload', 'documents.delete', 'documents.verify', 'documents.analyze',
  'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.edit', 'tasks.delete',
  'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
  'team.view', 'team.chat', 'team.contact.view', 'reports.view', 'backup.export',
  'chat.delete', 'ai.chat', 'ai.document_analysis', 'ai.project_analysis',
  'system.settings', 'audit.view'
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // xodim.txt assigns SUPER_ADMIN to the backend/system administrator. This
  // role manages technical settings and diagnostics, not management authority.
  SUPER_ADMIN: [
    'users.view', 'users.create', 'projects.view',
    'documents.view', 'documents.upload', 'documents.analyze',
    'tasks.view',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
    'team.view', 'team.chat', 'backup.export', 'chat.delete',
    'ai.chat', 'ai.document_analysis', 'ai.project_analysis',
    'system.settings', 'audit.view'
  ],
  // ADMIN is the laboratory head: full laboratory/project visibility and
  // management, without technical system configuration access.
  ADMIN: [
    'users.view', 'projects.view', 'projects.create', 'projects.edit', 'projects.delete',
    'documents.view', 'documents.upload', 'documents.delete', 'documents.verify', 'documents.analyze',
    'tasks.view', 'tasks.create', 'tasks.assign', 'tasks.edit', 'tasks.delete',
    'knowledge.view', 'knowledge.create', 'knowledge.edit', 'knowledge.delete',
    'team.view', 'team.chat', 'team.contact.view', 'reports.view', 'backup.export', 'chat.delete',
    'ai.chat', 'ai.document_analysis', 'ai.project_analysis', 'audit.view'
  ],
  USER: [
    'projects.view', 'documents.view', 'documents.upload', 'tasks.view', 'tasks.edit',
    'knowledge.view', 'team.chat', 'chat.delete', 'ai.chat'
  ]
};

export const NAVIGATION_PERMISSIONS: Partial<Record<'chat' | 'projects' | 'knowledge' | 'documents' | 'tasks' | 'team' | 'reports' | 'activity' | 'settings', Permission>> = {
  chat: 'ai.chat', projects: 'projects.view', knowledge: 'knowledge.view', documents: 'documents.view',
  tasks: 'tasks.view', team: 'team.view', reports: 'reports.view', activity: 'audit.view', settings: 'system.settings'
};

export function permissionsForRole(role: UserRole): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}

export function userWithPolicy(user: User): User {
  const permissions = permissionsForRole(user.role);
  return { ...user, permissions, phone: permissions.includes('team.contact.view') ? user.phone : undefined };
}

export function hasPermission(user: User, permission: Permission): boolean {
  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function canAccessProject(user: User, project: Project | undefined): boolean {
  if (user.role !== 'USER') return true;
  return Boolean(project && (project.managerId === user.id || project.teamIds?.includes(user.id)));
}

export function canOpenTab(user: User | null, tab: string): boolean {
  if (!user) return false;
  if (tab === 'team') return hasPermission(user, 'team.view') || hasPermission(user, 'team.chat');
  const permission = NAVIGATION_PERMISSIONS[tab as keyof typeof NAVIGATION_PERMISSIONS];
  return permission ? hasPermission(user, permission) : tab === 'dashboard';
}
