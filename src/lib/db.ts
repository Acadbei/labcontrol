import fs from 'fs';
import path from 'path';
import { randomUUID } from 'node:crypto';
import {
  User,
  Project,
  DocumentEntity,
  DocumentChunk,
  Task,
  KnowledgeItem,
  AuditLog,
  SystemSettings,
  ChatMessage,
  TeamChatMessage
} from '@/types';
import {
  SEED_USERS,
  SEED_PROJECTS,
  SEED_DOCUMENTS,
  SEED_CHUNKS,
  SEED_TASKS,
  SEED_KNOWLEDGE,
  SEED_AUDIT_LOGS,
  DEFAULT_SETTINGS
} from './data/seed-data';
import { loadStaffRoster } from './data/staff-roster-loader';

interface DatabaseSchema {
  users: User[];
  projects: Project[];
  documents: DocumentEntity[];
  chunks: DocumentChunk[];
  tasks: Task[];
  knowledge: KnowledgeItem[];
  auditLogs: AuditLog[];
  chatMessages: ChatMessage[];
  teamMessages?: TeamChatMessage[];
  settings: SystemSettings;
}

const DEMO_MODE = process.env.LABCONTROL_DEMO_MODE === 'true';
if (DEMO_MODE && process.env.NODE_ENV === 'production') {
  throw new Error('LABCONTROL_DEMO_MODE production muhitida taqiqlangan');
}
const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_DATABASE_FILE || path.join(DEFAULT_DATA_DIR, DEMO_MODE ? 'database.json' : 'production.database.json'));
const DATA_DIR = path.dirname(DB_FILE);
const UPLOADS_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.LABCONTROL_UPLOADS_DIR || path.join(DATA_DIR, 'uploads'));

class DatabaseStore {
  private data: DatabaseSchema;

  constructor() {
    this.ensureDirs();
    this.data = this.loadData();
  }

  private ensureDirs() {
    if (!fs.existsSync(/*turbopackIgnore: true*/ DATA_DIR)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(/*turbopackIgnore: true*/ UPLOADS_DIR)) {
      fs.mkdirSync(/*turbopackIgnore: true*/ UPLOADS_DIR, { recursive: true });
    }
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(/*turbopackIgnore: true*/ DB_FILE)) {
      try {
        const raw = fs.readFileSync(/*turbopackIgnore: true*/ DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        const loaded: DatabaseSchema = {
          users: Array.isArray(parsed.users) ? parsed.users.map((user: User) => DEMO_MODE ? { ...user, isDemo: true } : user) : [],
          projects: Array.isArray(parsed.projects) ? parsed.projects.map((project: Project) => DEMO_MODE ? { ...project, isDemo: true } : project) : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents.map((document: DocumentEntity) => DEMO_MODE ? { ...document, verified: false, verifiedById: undefined, verifiedByName: undefined, verifiedAt: undefined, isDemo: true } : document) : [],
          chunks: Array.isArray(parsed.chunks) ? parsed.chunks : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map((task: Task) => DEMO_MODE ? { ...task, isDemo: true } : task) : [],
          knowledge: Array.isArray(parsed.knowledge) ? parsed.knowledge.map((item: KnowledgeItem) => DEMO_MODE ? { ...item, isDemo: true } : item) : [],
          auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs.map((log: AuditLog) => DEMO_MODE ? { ...log, isDemo: true } : log) : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          teamMessages: Array.isArray(parsed.teamMessages) ? parsed.teamMessages : [],
          settings: parsed.settings && typeof parsed.settings === 'object' ? { ...DEFAULT_SETTINGS, ...parsed.settings } : { ...DEFAULT_SETTINGS }
        };
        if (!DEMO_MODE && loaded.users.length === 0) {
          loaded.users = loadStaffRoster();
          this.saveData(loaded);
        }
        return loaded;
      } catch (parseError: any) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupCorruptedPath = path.join(DATA_DIR, `database.corrupted.${timestamp}.json`);
        try {
          fs.copyFileSync(/*turbopackIgnore: true*/ DB_FILE, backupCorruptedPath);
          console.error(
            `[XAVFSIZLIK OGOHLANTIRISHI] database.json buzilgan! Asl ma’lumotlar saqlab qolindi: ${backupCorruptedPath}. Xato:`,
            parseError
          );
        } catch (copyErr) {
          console.error('Buzilgan bazani zaxiralashda xatolik:', copyErr);
        }
        throw new Error(
          `Baza fayli (database.json) shikastlangan. Ma’lumotlar yo‘qolishining oldini olish uchun fayl ${backupCorruptedPath} ga xavfsiz zaxiralandi. JSON sintaksisini tekshiring.`
        );
      }
    }

    const initialData: DatabaseSchema = DEMO_MODE ? {
      users: SEED_USERS.map(user => ({ ...user, isDemo: true })), projects: SEED_PROJECTS.map(project => ({ ...project, isDemo: true })), documents: SEED_DOCUMENTS.map(document => ({ ...document, isDemo: true, verified: false })),
      chunks: [...SEED_CHUNKS], tasks: SEED_TASKS.map(task => ({ ...task, isDemo: true })), knowledge: SEED_KNOWLEDGE.map(item => ({ ...item, isDemo: true })),
      auditLogs: SEED_AUDIT_LOGS.map(log => ({ ...log, isDemo: true })), chatMessages: [], teamMessages: [], settings: { ...DEFAULT_SETTINGS }
    } : {
      users: loadStaffRoster(), projects: [], documents: [], chunks: [], tasks: [], knowledge: [],
      auditLogs: [], chatMessages: [], teamMessages: [], settings: { ...DEFAULT_SETTINGS }
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    try {
      this.ensureDirs();
      fs.writeFileSync(/*turbopackIgnore: true*/ DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to write database.json:', e);
    }
  }

  // Users & Session
  getUsers(): User[] {
    return this.data.users;
  }

  getUser(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find(user => (user.email || '').toLowerCase() === normalized);
  }

  getUserByLoginId(loginId: string): User | undefined {
    const normalized = loginId.trim().toLowerCase();
    return this.data.users.find(user => (user.loginId || '').toLowerCase() === normalized);
  }

  getUserByLoginIdentifier(identifier: string): User | undefined {
    return this.getUserByLoginId(identifier) || this.getUserByEmail(identifier);
  }

  createUser(user: Omit<User, 'id' | 'isDemo'>): User {
    const normalizedEmail = user.email.trim().toLowerCase();
    if (this.getUserByEmail(normalizedEmail) || this.getUserByLoginId(normalizedEmail)) {
      throw new Error('Bu elektron pochta allaqachon ro‘yxatdan o‘tgan');
    }
    const created: User = {
      ...user,
      id: `user-${randomUUID()}`,
      loginId: normalizedEmail,
      email: normalizedEmail,
      isDemo: DEMO_MODE
    };
    this.data.users.push(created);
    this.saveData(this.data);
    return created;
  }

  deleteUser(id: string): boolean {
    const originalLength = this.data.users.length;
    this.data.users = this.data.users.filter(user => user.id !== id);
    if (this.data.users.length === originalLength) return false;
    this.saveData(this.data);
    return true;
  }

  updateUser(id: string, updates: Partial<User>): User {
    const user = this.getUser(id);
    if (!user) {
      throw new Error('Foydalanuvchi topilmadi');
    }
    Object.assign(user, updates);
    this.saveData(this.data);
    this.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'PROFIL YANGILANDI',
      object: user.name,
      details: 'Foydalanuvchi profili va ma’lumotlari muvaffaqiyatli yangilandi',
      ip: '127.0.0.1',
      status: 'SUCCESS'
    });
    return user;
  }

  // Projects
  getProjects(): Project[] {
    return this.data.projects;
  }

  getProject(id: string): Project | undefined {
    return this.data.projects.find(p => p.id === id);
  }

  createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project {
    const id = `proj-${randomUUID()}`;
    const newProj: Project = {
      ...project,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.projects.unshift(newProj);
    this.saveData(this.data);
    return newProj;
  }

  updateProject(id: string, updates: Partial<Project>): Project | null {
    const index = this.data.projects.findIndex(p => p.id === id);
    if (index === -1) return null;
    this.data.projects[index] = {
      ...this.data.projects[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData(this.data);
    return this.data.projects[index];
  }

  deleteProject(id: string): boolean {
    const initialLen = this.data.projects.length;
    this.data.projects = this.data.projects.filter(p => p.id !== id);
    if (this.data.projects.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  assignTeamMemberToProject(projectId: string, userId: string): boolean {
    const proj = this.getProject(projectId);
    if (!proj) return false;
    if (!proj.teamIds.includes(userId)) {
      proj.teamIds.push(userId);
      this.saveData(this.data);
    }
    return true;
  }

  removeTeamMemberFromProject(projectId: string, userId: string): boolean {
    const proj = this.getProject(projectId);
    if (!proj) return false;
    proj.teamIds = proj.teamIds.filter(id => id !== userId);
    this.saveData(this.data);
    return true;
  }

  attachDocumentToProject(docId: string, projectId: string): boolean {
    const doc = this.getDocument(docId);
    const proj = this.getProject(projectId);
    if (!doc || !proj) return false;
    doc.projectId = proj.id;
    doc.projectName = proj.name;
    proj.documentsCount = this.data.documents.filter(d => d.projectId === proj.id).length;
    this.saveData(this.data);
    return true;
  }

  detachDocumentFromProject(docId: string): boolean {
    const doc = this.getDocument(docId);
    if (!doc) return false;
    const oldProjId = doc.projectId;
    doc.projectId = undefined;
    doc.projectName = undefined;
    if (oldProjId) {
      const proj = this.getProject(oldProjId);
      if (proj) {
        proj.documentsCount = this.data.documents.filter(d => d.projectId === oldProjId).length;
      }
    }
    this.saveData(this.data);
    return true;
  }

  // Documents & Chunks
  getDocuments(projectId?: string): DocumentEntity[] {
    if (projectId) {
      return this.data.documents.filter(d => d.projectId === projectId);
    }
    return this.data.documents;
  }

  getDocument(id: string): DocumentEntity | undefined {
    return this.data.documents.find(d => d.id === id);
  }

  addDocument(doc: DocumentEntity, chunks: DocumentChunk[]): DocumentEntity {
    this.data.documents.unshift(doc);
    this.data.chunks.push(...chunks);
    this.saveData(this.data);
    return doc;
  }

  updateDocument(id: string, updates: Partial<DocumentEntity>): DocumentEntity | null {
    const index = this.data.documents.findIndex(document => document.id === id);
    if (index < 0) return null;
    this.data.documents[index] = { ...this.data.documents[index], ...updates };
    this.saveData(this.data);
    return this.data.documents[index];
  }

  deleteDocument(id: string): boolean {
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    this.data.chunks = this.data.chunks.filter(c => c.docId !== id);
    this.saveData(this.data);
    return true;
  }

  getChunks(docId?: string): DocumentChunk[] {
    if (docId) {
      return this.data.chunks.filter(c => c.docId === docId);
    }
    return this.data.chunks;
  }

  // Tasks
  getTasks(projectId?: string, assigneeId?: string): Task[] {
    let list = this.data.tasks;
    if (projectId) list = list.filter(t => t.projectId === projectId);
    if (assigneeId) list = list.filter(t => t.assigneeId === assigneeId);
    return list;
  }

  getTask(id: string): Task | undefined {
    return this.data.tasks.find(t => t.id === id);
  }

  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'comments'>): Task {
    const id = `task-${randomUUID()}`;
    const newTask: Task = {
      ...task,
      id,
      comments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.data.tasks.unshift(newTask);
    this.saveData(this.data);
    return newTask;
  }

  updateTask(id: string, updates: Partial<Task>): Task | null {
    const index = this.data.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.data.tasks[index] = {
      ...this.data.tasks[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData(this.data);
    return this.data.tasks[index];
  }

  deleteTask(id: string): boolean {
    const initialLen = this.data.tasks.length;
    this.data.tasks = this.data.tasks.filter(t => t.id !== id);
    if (this.data.tasks.length !== initialLen) {
      this.saveData(this.data);
      return true;
    }
    return false;
  }

  // Knowledge Items
  getKnowledge(projectId?: string): KnowledgeItem[] {
    if (projectId) return this.data.knowledge.filter(k => k.projectId === projectId);
    return this.data.knowledge;
  }

  addKnowledge(item: Omit<KnowledgeItem, 'id' | 'updatedAt'>): KnowledgeItem {
    const newItem: KnowledgeItem = {
      ...item,
      id: `kno-${randomUUID()}`,
      updatedAt: new Date().toISOString()
    };
    this.data.knowledge.unshift(newItem);
    this.saveData(this.data);
    return newItem;
  }

  updateKnowledge(id: string, updates: Partial<KnowledgeItem>): KnowledgeItem | null {
    const index = this.data.knowledge.findIndex(item => item.id === id);
    if (index < 0) return null;
    this.data.knowledge[index] = {
      ...this.data.knowledge[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData(this.data);
    return this.data.knowledge[index];
  }

  deleteKnowledge(id: string): boolean {
    const initialLength = this.data.knowledge.length;
    this.data.knowledge = this.data.knowledge.filter(item => item.id !== id);
    if (this.data.knowledge.length === initialLength) return false;
    this.saveData(this.data);
    return true;
  }

  // Audit Logs
  getAuditLogs(): AuditLog[] {
    return this.data.auditLogs;
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log-${randomUUID()}`,
      timestamp: new Date().toISOString()
    };
    this.data.auditLogs.unshift(newLog);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.saveData(this.data);
    return newLog;
  }

  // Chat Messages
  getChatMessages(userId: string): ChatMessage[] {
    return this.data.chatMessages.filter(message => message.senderId === userId);
  }

  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg-${randomUUID()}`,
      timestamp: new Date().toISOString()
    };
    this.data.chatMessages.push(newMsg);
    if (this.data.chatMessages.length > 200) {
      this.data.chatMessages = this.data.chatMessages.slice(-200);
    }
    this.saveData(this.data);
    return newMsg;
  }

  clearChatMessages(userId: string) {
    this.data.chatMessages = this.data.chatMessages.filter(message => message.senderId !== userId);
    this.saveData(this.data);
  }

  // Settings
  getSettings(): SystemSettings {
    return this.data.settings;
  }

  updateSettings(settings: Partial<SystemSettings>): SystemSettings {
    this.data.settings = {
      ...this.data.settings,
      ...settings
    };
    this.saveData(this.data);
    return this.data.settings;
  }

  // Laboratoriya Jamoasi Umumiy Guruhi (Team Group Chat)
  getTeamMessages(): TeamChatMessage[] {
    return this.data.teamMessages || [];
  }

  addTeamMessage(msg: Omit<TeamChatMessage, 'id' | 'timestamp'> & { timestamp?: string }): TeamChatMessage {
    if (!this.data.teamMessages) {
      this.data.teamMessages = [];
    }
    const fullMsg: TeamChatMessage = {
      id: `tmsg-${randomUUID()}`,
      timestamp: msg.timestamp || new Date().toISOString(),
      ...msg
    };
    this.data.teamMessages.push(fullMsg);
    this.saveData(this.data);
    return fullMsg;
  }

  // Complete DB snapshot export for backups
  getBackupSnapshot(includeContacts = false): DatabaseSchema {
    const snapshot = { ...(this.data as any) };
    delete snapshot.currentUserId;
    if (!includeContacts) snapshot.users = snapshot.users.map((user: User) => ({ ...user, email: '', phone: undefined }));
    if (snapshot.settings) {
      snapshot.settings = { ...snapshot.settings };
      delete snapshot.settings.geminiApiKey;
      delete snapshot.settings.openaiApiKey;
    }
    return JSON.parse(JSON.stringify(snapshot));
  }
}

// Singleton instance
const globalForDb = global as unknown as { dbStore?: DatabaseStore };
export const db = globalForDb.dbStore || new DatabaseStore();
if (process.env.NODE_ENV !== 'production') globalForDb.dbStore = db;
