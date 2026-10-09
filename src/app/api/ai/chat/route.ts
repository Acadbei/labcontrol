import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { searchDocumentChunks, searchKnowledgeItems } from '@/lib/ai/rag';
import { getAIProvider, ExtractiveSourceProvider, NOT_FOUND } from '@/lib/ai/provider';
import { canAccessProject } from '@/lib/policy';
import { isAuthResponse, requirePermission } from '@/lib/auth';
import { RetrievedSource } from '@/lib/ai/rag';
import { findMatchingTeamMembers } from '@/lib/data/team-capabilities';
import { isCyrillic } from '@/lib/transliterate';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const requestWindows = new Map<string, { startedAt: number; count: number }>();
const OPERATIONAL_QUESTION = /\b(kim|qila oladi|qila|bajaradi|mas.?ul|javobgar|biriktir|vazifa|holat|status|nima bo.?ldi|nima bo.?lyapti|faoliyat|tarix|who|responsible|assigned|task|status|what happened)\b/i;
function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const current = requestWindows.get(userId);
  if (!current || now - current.startedAt >= 60_000) { requestWindows.set(userId, { startedAt: now, count: 1 }); return true; }
  if (current.count >= 20) return false;
  current.count += 1;
  return true;
}

function queryTerms(text: string): string[] {
  return [...new Set((text.toLocaleLowerCase('uz').match(/[\p{L}\p{N}]{3,}/gu) || [])
    .filter(term => !['qanday', 'qanaqa', 'qaysi', 'qayer', 'qachon', 'qancha', 'nima', 'kim', 'bilan', 'uchun', 'haqida', 'bo‘yicha', 'bo‘yicha', 'what', 'which', 'how', 'where', 'when', 'who', 'about', 'with', 'the'].includes(term)))];
}

function relevance(query: string, body: string): number {
  const terms = queryTerms(query);
  if (!terms.length) return 0;
  const searchable = body.toLocaleLowerCase('uz');
  const hits = terms.filter(term => searchable.includes(term)).length;
  return hits / terms.length;
}

function makeWorkspaceSources(prompt: string, user: { id: string; role: string; permissions: string[] }, projectId?: string): RetrievedSource[] {
  const operationQuestion = OPERATIONAL_QUESTION.test(prompt);
  const projects = db.getProjects().filter(project => project.isDemo !== true
    && canAccessProject(user as any, project)
    && (!projectId || project.id === projectId));
  const projectIds = new Set(projects.map(project => project.id));
  const peopleQuestion = /\b(kim|xodim|jamoa|mutaxassis|dasturchi|konstruktor|bajaradi|qila oladi|mas.?ul|javobgar|who|staff|team|expert|developer|constructor)\b/i.test(prompt);

  const projectSources: RetrievedSource[] = projects.map(project => {
    const team = [...new Set([project.managerId, ...project.teamIds])]
      .map(id => db.getUser(id))
      .filter((member): member is NonNullable<typeof member> => Boolean(member))
      .map(member => `${member.name} — ${member.position}${member.specialty ? `; yo‘nalish: ${member.specialty}` : ''}`);
    const decisions = project.decisions.slice(0, 5).map(decision => `${decision.date}: ${decision.title} (qaror qilgan: ${decision.decidedBy})`);
    const body = [
      `Loyiha: ${project.name} (${project.code})`, `Holat: ${project.status}; ustuvorlik: ${project.priority}; bajarilish: ${project.progressPercent}%`,
      `Muddat: ${project.deadline}; loyiha rahbari ID: ${project.managerId}`,
      `Tavsif: ${project.description}`, `Umumiy ko‘rinish: ${project.overview}`,
      `Jamoa: ${team.join('; ')}`, `Texnik parametrlar: ${project.technicalParameters.map(param => `${param.key}: ${param.value}${param.unit ? ` ${param.unit}` : ''}`).join('; ')}`,
      `Qarorlar: ${decisions.join('; ')}`, `Teglar: ${project.tags.join(', ')}`,
      `Hujjatlar soni: ${db.getDocuments(project.id).length}; vazifalar soni: ${db.getTasks(project.id).length}`
    ].filter(Boolean).join('\n').slice(0, 2200);
    const score = Math.max(projectId === project.id ? 1 : 0, relevance(prompt, `${project.name} ${project.code} ${project.description} ${project.overview} ${project.tags.join(' ')}`), operationQuestion ? 0.38 : 0.12);
    return { sourceType: 'project' as const, sourceId: project.id, title: project.name, label: `Loyiha · ${project.code}`, chunkId: `project-${project.id}`, text: body, score };
  }).sort((a, b) => b.score - a.score).slice(0, projectId ? 3 : peopleQuestion || operationQuestion ? 5 : 2);

  const tasks = db.getTasks(projectId).filter(task => task.isDemo !== true
    && projectIds.has(task.projectId)
    && (user.role !== 'USER' || task.assigneeId === user.id || task.creatorId === user.id));
  const taskSources: RetrievedSource[] = tasks.map(task => {
    const comments = task.comments.slice(-3).map(comment => `${comment.createdAt.slice(0, 10)} ${comment.userName}: ${comment.text}`).join('\n');
    const body = [
      `Vazifa: ${task.title}`, `Loyiha: ${task.projectName || projects.find(project => project.id === task.projectId)?.name || 'Noma’lum loyiha'}`,
      `Holat: ${task.status}; ustuvorlik: ${task.priority}; muddat: ${task.deadline}`,
      `Mas’ul: ${task.assigneeName || 'biriktirilmagan'}; yaratuvchi: ${task.creatorName || 'noma’lum'}`,
      `Tavsif: ${task.description}`, `Teglar: ${task.tags.join(', ')}`, `So‘nggi izohlar:\n${comments}`
    ].filter(Boolean).join('\n').slice(0, 1800);
    const score = Math.max(projectId === task.projectId ? 0.7 : 0, relevance(prompt, `${task.title} ${task.description} ${task.projectName || ''} ${task.assigneeName || ''} ${task.tags.join(' ')} ${comments}`), operationQuestion ? 0.34 : 0.08);
    return { sourceType: 'task' as const, sourceId: task.id, title: task.title, label: `Vazifa · ${task.projectName || ''}`, chunkId: `task-${task.id}`, text: body, score };
  }).sort((a, b) => b.score - a.score || Date.parse(tasks.find(task => task.id === b.sourceId)?.updatedAt || '') - Date.parse(tasks.find(task => task.id === a.sourceId)?.updatedAt || '')).slice(0, operationQuestion ? 8 : 4);

  let peopleSources: RetrievedSource[] = [];
  if (peopleQuestion && user.permissions.includes('team.view')) {
    const matchedMembers = findMatchingTeamMembers(prompt);
    peopleSources = matchedMembers.map(member => {
      const body = [
        `Xodim: ${member.name} (${member.role})`,
        `Lavozim: ${member.position}`,
        `Mutaxassislik yo‘nalishi: ${member.specialty}`,
        `Nima qila oladi: ${member.whatCanDo.join(' ')}`,
        `Vakolat va mas’uliyat: ${member.responsibilities}`
      ].join('\n');
      const termsRel = relevance(prompt, `${member.name} ${member.position} ${member.specialty} ${member.keywords.join(' ')} ${member.whatCanDo.join(' ')}`);
      const score = Math.max(0.45, termsRel + 0.3);
      return {
        sourceType: 'staff' as const,
        sourceId: member.id,
        title: member.name,
        label: `Jamoa a’zosi · ${member.position}`,
        chunkId: `staff-${member.id}`,
        text: body,
        score
      };
    }).sort((a, b) => b.score - a.score).slice(0, 6);
  }

  let activitySources: RetrievedSource[] = [];
  if (user.permissions.includes('audit.view') && /nima bo|faoliyat|tarix|o.?zgardi|kim qil|what happened|activity|history/i.test(prompt)) {
    const projectMatchers = projects.flatMap(project => [project.name, project.code]).map(value => value.toLocaleLowerCase('uz'));
    const projectTaskTitles = new Set(tasks.map(task => task.title.toLocaleLowerCase('uz')));
    activitySources = db.getAuditLogs().filter(log => log.isDemo !== true
      && (!projectId || projectMatchers.some(name => name && `${log.object} ${log.details}`.toLocaleLowerCase('uz').includes(name))
        || projectTaskTitles.has(log.object.toLocaleLowerCase('uz'))))
      .slice(0, projectId ? 12 : 10)
      .map(log => {
        const body = `Kim: ${log.userName}; amal: ${log.action}; obyekt: ${log.object}; tafsilot: ${log.details}; vaqt: ${log.timestamp}; holat: ${log.status}`;
        return { sourceType: 'activity' as const, sourceId: log.id, title: log.object, label: `Faoliyat · ${log.action}`, chunkId: `activity-${log.id}`, text: body, score: Math.max(0.35, relevance(prompt, body)) };
      });
  }

  return [...projectSources, ...taskSources, ...peopleSources, ...activitySources]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

export async function GET(request: Request) {
  const user = await requirePermission(request, 'ai.chat');
  if (isAuthResponse(user)) return user;
  return NextResponse.json(db.getChatMessages(user.id), { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  const user = await requirePermission(request, 'ai.chat');
  if (isAuthResponse(user)) return user;
  if (!withinRateLimit(user.id)) return NextResponse.json({ error: 'So‘rovlar limiti tugadi; bir daqiqadan keyin urinib ko‘ring.' }, { status: 429 });
  try {
    const body = await request.json();
    const rawPrompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt || rawPrompt.length > 4000) return NextResponse.json({ error: 'So‘rov 1–4000 belgi bo‘lishi kerak' }, { status: 400 });

    const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (openRouterApiKey) {
      if (body?.consent !== true) {
        return NextResponse.json({ error: 'OpenRouter’ga yuborish tasdiqlanmadi; savol va ichki manba parchalari yuborilmadi.' }, { status: 403 });
      }
    }

    const chatHistory = db.getChatMessages(user.id);
    let effectivePrompt = rawPrompt;
    let useAsadbekGpt = body?.useAsadbekGpt === true || /\b(asadbekgpt|acadbekgpt)\b/i.test(rawPrompt);

    // If user confirmed AsadbekGPT via affirmative response ("ha", "AsadbekGPT qidir", etc.)
    const isAffirmative = /^(ha|ha qidir|ha qidirilsin|ha asadbekgpt|asadbekgpt orqali qidir|acadbekgpt orqali qidir|qidir|izla|top)$/i.test(rawPrompt.trim());
    if (isAffirmative) {
      useAsadbekGpt = true;
      const lastUserMsg = [...chatHistory].reverse().find(m => m.role === 'user' && m.content.trim() !== rawPrompt.trim());
      if (lastUserMsg) {
        effectivePrompt = lastUserMsg.content;
      }
    }

    const script = isCyrillic(effectivePrompt) ? 'cyrillic' : 'latin';
    const projectId = typeof body?.projectId === 'string' && body.projectId ? body.projectId : undefined;
    if (projectId) {
      const project = db.getProject(projectId);
      if (!project) return NextResponse.json({ error: 'Loyiha topilmadi' }, { status: 404 });
      if (!canAccessProject(user, project)) return NextResponse.json({ error: 'Loyihaga kirish taqiqlangan' }, { status: 403 });
    }
    const allowedDocs = new Set(db.getDocuments().filter(document => document.projectId
      ? canAccessProject(user, db.getProject(document.projectId))
      : user.role !== 'USER' || document.uploadedById === user.id).map(document => document.id));
    const allowedKnowledge = new Set(db.getKnowledge().filter(item => item.projectId
      ? canAccessProject(user, db.getProject(item.projectId))
      : user.role !== 'USER' || item.ownerId === user.id).map(item => item.id));
    const documentSources = searchDocumentChunks(effectivePrompt, projectId, 6, allowedDocs);
    const knowledgeSources = searchKnowledgeItems(effectivePrompt, projectId, 6, allowedKnowledge);
    const workspaceSources = makeWorkspaceSources(effectivePrompt, user, projectId);
    const sources = [
      ...documentSources.slice(0, 4),
      ...knowledgeSources.slice(0, 4),
      ...workspaceSources.slice(0, 5)
    ].sort((left, right) => right.score - left.score).slice(0, 10);

    const settings = db.getSettings();
    let response;
    try {
      const provider = getAIProvider(settings);
      response = await provider.chat(effectivePrompt, chatHistory, sources, undefined, { useAsadbekGpt, script });
    } catch {
      const fallbackProvider = new ExtractiveSourceProvider();
      response = await fallbackProvider.chat(effectivePrompt, chatHistory, sources);
    }

    const userMessage = db.addChatMessage({ role: 'user', content: rawPrompt, senderId: user.id });
    const assistantMessage = db.addChatMessage({ role: 'assistant', content: response.content, senderId: user.id, citations: response.citations });
    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      action: 'AI YORDAMCHI JAVOBI',
      object: 'Yordamchi',
      details: `${response.providerUsed} orqali javob berildi (${response.citations.length} ta manba)`,
      ip: 'unknown',
      status: 'SUCCESS'
    });
    return NextResponse.json({ userMessage, assistantMessage, provider: response.providerUsed });
  } catch {
    return NextResponse.json({ error: 'Yordamchi so‘rovni bajara olmadi; manbalar tekshirilmadi.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const user = await requirePermission(request, 'chat.delete');
  if (isAuthResponse(user)) return user;
  db.clearChatMessages(user.id);
  db.addAuditLog({ userId: user.id, userName: user.name, action: 'O‘Z CHAT TARIXI TOZALANDI', object: 'Shaxsiy chat', details: 'Faqat joriy hisob tarixidan xabarlar o‘chirildi', ip: 'unknown', status: 'WARNING' });
  return NextResponse.json({ success: true });
}
