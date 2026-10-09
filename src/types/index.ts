export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';

export type UserPosition =
  | 'Laboratoriya boshlig‘i'
  | 'Backend dasturchi'
  | 'Frontend dasturchi'
  | 'Umumiy dasturchi'
  | 'Konstruktor, 3D loyihalovchi';

export type Permission =
  | 'users.view'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'projects.view'
  | 'projects.create'
  | 'projects.edit'
  | 'projects.delete'
  | 'documents.view'
  | 'documents.upload'
  | 'documents.delete'
  | 'documents.verify'
  | 'documents.analyze'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.assign'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'ai.chat'
  | 'ai.document_analysis'
  | 'ai.project_analysis'
  | 'knowledge.view'
  | 'knowledge.create'
  | 'knowledge.edit'
  | 'knowledge.delete'
  | 'team.view'
  | 'team.chat'
  | 'team.contact.view'
  | 'reports.view'
  | 'backup.export'
  | 'chat.delete'
  | 'system.settings'
  | 'audit.view';

export interface User {
  id: string;
  loginId?: string;
  staffRosterId?: string;
  identitySource?: string;
  name: string;
  email: string;
  role: UserRole;
  position: UserPosition;
  avatar?: string;
  permissions: Permission[];
  phone?: string;
  specialty?: string;
  isDemo?: boolean;
}

export type ProjectStatus =
  | 'Planning'
  | 'Active'
  | 'On Hold'
  | 'Testing'
  | 'Completed'
  | 'Archived';

export type ProjectActivityStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'completed'
  | 'suspended';

export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TechnicalParameter {
  key: string;
  value: string;
  unit?: string;
  category?: string;
  sourceDocId?: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  status: ProjectStatus;
  activityStatus?: ProjectActivityStatus;
  priority: Priority;
  startDate: string;
  deadline: string;
  managerId: string;
  teamIds: string[];
  documentsCount: number;
  tasksCount: number;
  progressPercent: number;
  technicalParameters: TechnicalParameter[];
  overview: string;
  decisions: { id: string; title: string; date: string; decidedBy: string }[];
  tags: string[];
  estimatedBudget?: number;
  budgetCurrency?: string;
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName?: string;
  assigneeId: string;
  assigneeName?: string;
  creatorId: string;
  creatorName?: string;
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  aiSummary?: string;
  comments: TaskComment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  isDemo?: boolean;
}

export type SupportedFileType = 'pdf' | 'docx' | 'pptx' | 'txt' | 'csv';

export interface DocumentChunk {
  id: string;
  docId: string;
  chunkIndex: number;
  text: string;
  pageOrSlide?: number;
  sectionTitle?: string;
  embedding?: number[];
}

export interface DocumentEntity {
  id: string;
  title: string;
  originalName: string;
  fileType: SupportedFileType;
  fileSize: number;
  storagePath?: string;
  projectId?: string;
  projectName?: string;
  uploadedById: string;
  uploadedByName: string;
  uploadedAt: string;
  version: number;
  summary: string;
  tags: string[];
  technicalParameters: TechnicalParameter[];
  pageCount?: number;
  slideCount?: number;
  wordCount?: number;
  isIndexed: boolean;
  chunksCount: number;
  verified?: boolean;
  provenance?: string;
  verifiedById?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  isDemo?: boolean;
}

export interface Citation {
  sourceType?: 'document' | 'knowledge' | 'project' | 'task' | 'activity' | 'staff';
  sourceId?: string;
  documentId: string;
  knowledgeId?: string;
  documentTitle: string;
  originalName: string;
  chunkId: string;
  pageOrSlide?: number;
  snippet: string;
  verified?: boolean;
}

export interface AIActionProposal {
  actionType: 'create_task' | 'create_project' | 'assign_task' | 'search_documents' | 'generate_report';
  label: string;
  parameters: Record<string, any>;
  confirmed?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  senderId?: string;
  timestamp: string;
  citations?: Citation[];
  actionProposal?: AIActionProposal;
  isPersonal?: boolean;
}

export interface KnowledgeItem {
  id: string;
  title: string;
  category: 'Standard' | 'Specification' | 'Hardware' | 'Software' | 'CAD/3D' | 'Research';
  content: string;
  projectId?: string;
  projectName?: string;
  technicalParams: TechnicalParameter[];
  tags: string[];
  updatedAt: string;
  ownerId?: string;
  isDemo?: boolean;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  object: string;
  details: string;
  ip: string;
  timestamp: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
  isDemo?: boolean;
}

export interface SystemSettings {
  aiProvider: 'ollama' | 'local_extractive';
  ollamaUrl: string;
  modelName: string;
  laboratoryName: string;
  secondBrainTitle: string;
}

export interface TeamChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPosition: string;
  senderRole: UserRole;
  content: string;
  timestamp: string;
  category?: 'general' | 'urgent' | 'test_report' | 'task_update';
}
