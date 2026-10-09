import { db } from '@/lib/db';
import { KnowledgeItem } from '@/types';

const STOP_WORDS = new Set([
  'qanday', 'qanaqa', 'qaysi', 'qayer', 'qayerda', 'qayerga', 'qayerdan', 'qachon', 'qancha', 'nima', 'nimaga', 'nimani', 'nega',
  'haqida', 'boyicha', 'uchun', 'bilan', 'yoki', 'ham', 'qilib', 'iltimos', 'ayting', 'bering', 'menga', 'sizga',
  'what', 'which', 'how', 'where', 'when', 'why', 'please', 'about', 'the', 'and', 'with', 'for', 'from', 'into', 'does', 'did', 'is', 'are', 'was', 'were', 'this', 'that', 'can', 'could',
  'kak', 'chto', 'gde', 'pochemu', 'kogda', 'dlya'
]);

const UZBEK_SUFFIXES = [
  'larimizdan', 'laringizdan', 'larimizga', 'laringizga', 'larimizni', 'laringizni', 'larimizda', 'laringizda',
  'laridan', 'larining', 'lariga', 'larida', 'larini', 'larimiz', 'laringiz', 'larining', 'larning', 'lari', 'lar',
  'imizdan', 'ingizdan', 'imizga', 'ingizga', 'imizni', 'ingizni', 'imizda', 'ingizda', 'imiz', 'ingiz',
  'ning', 'dagi', 'dan', 'ga', 'da', 'ni', 'si', 'i'
].sort((left, right) => right.length - left.length);

export interface RetrievedSource {
  sourceType: 'document' | 'knowledge' | 'project' | 'task' | 'activity' | 'staff';
  sourceId: string;
  title: string;
  label: string;
  chunkId: string;
  page?: number;
  text: string;
  score: number;
  verified?: boolean;
}

export function searchDocumentChunks(query: string, projectId?: string, topK = 4, allowedDocumentIds?: Set<string>): RetrievedSource[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  const documents = db.getDocuments().filter(document => document.isDemo !== true && (!allowedDocumentIds || allowedDocumentIds.has(document.id)) && (!projectId || !document.projectId || document.projectId === projectId));
  const docMap = new Map(documents.map(document => [document.id, document]));
  const queryTerms = tokenize(normalizedQuery);
  if (!queryTerms.length) return [];
  const synonyms = expandSynonyms(queryTerms);
  const scored: RetrievedSource[] = [];

  for (const chunk of db.getChunks()) {
    const document = docMap.get(chunk.docId);
    if (!document) continue;
    const chunkTerms = new Set(tokenize(`${chunk.text} ${chunk.sectionTitle || ''} ${document.title} ${document.tags.join(' ')}`));
    const directMatches = queryTerms.filter(term => chunkTerms.has(term));
    const minimumDirectMatches = queryTerms.length >= 3 ? 2 : 1;
    if (directMatches.length < minimumDirectMatches || directMatches.length / queryTerms.length < 0.4) continue;

    const synonymMatches = synonyms.filter(term => chunkTerms.has(term));
    let score = (directMatches.length + synonymMatches.length * 0.2) / Math.max(queryTerms.length, 1);
    if (chunk.text.toLowerCase().includes(normalizedQuery.toLowerCase())) score += 0.2;
    score = Math.min(1, score);
    if (score < 0.35) continue;
    scored.push({ sourceType: 'document', sourceId: document.id, title: document.title, label: document.originalName, chunkId: chunk.id, page: chunk.pageOrSlide, text: chunk.text, score, verified: document.verified === true });
  }

  scored.sort((left, right) => right.score - left.score);
  return scored.slice(0, Math.max(0, Math.min(topK, 10)));
}

export function searchKnowledgeItems(query: string, projectId?: string, topK = 4, allowedKnowledgeIds?: Set<string>): RetrievedSource[] {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];
  const items = db.getKnowledge().filter(item => item.isDemo !== true
    && (!allowedKnowledgeIds || allowedKnowledgeIds.has(item.id))
    && (!projectId || !item.projectId || item.projectId === projectId));
  return rankKnowledge(normalizedQuery, items).slice(0, Math.max(0, Math.min(topK, 10)));
}

function rankKnowledge(query: string, items: KnowledgeItem[]): RetrievedSource[] {
  const queryTerms = tokenize(query);
  if (!queryTerms.length) return [];
  const synonyms = expandSynonyms(queryTerms);
  const scored: RetrievedSource[] = [];

  for (const item of items) {
    const body = `${item.content} ${item.title} ${item.category} ${item.tags.join(' ')} ${item.technicalParams.map(param => `${param.key} ${param.value} ${param.unit || ''}`).join(' ')}`;
    const itemTerms = new Set(tokenize(body));
    const directMatches = queryTerms.filter(term => itemTerms.has(term));
    const minimumDirectMatches = queryTerms.length >= 3 ? 2 : 1;
    if (directMatches.length < minimumDirectMatches || directMatches.length / queryTerms.length < 0.4) continue;
    const synonymMatches = synonyms.filter(term => itemTerms.has(term));
    let score = (directMatches.length + synonymMatches.length * 0.2) / Math.max(queryTerms.length, 1);
    if (body.toLocaleLowerCase('uz').includes(query.toLocaleLowerCase('uz'))) score += 0.2;
    score = Math.min(1, score);
    if (score < 0.35) continue;
    const excerpt = extractKnowledgeExcerpt(item, queryTerms);
    scored.push({
      sourceType: 'knowledge', sourceId: item.id, title: item.title,
      label: `Bilim bazasi · ${item.category}`, chunkId: `${item.id}-excerpt`,
      text: excerpt, score
    });
  }

  return scored.sort((left, right) => right.score - left.score);
}

function extractKnowledgeExcerpt(item: KnowledgeItem, queryTerms: string[]): string {
  const content = item.content.replace(/\s+/g, ' ').trim();
  const lowerContent = content.toLocaleLowerCase('uz');
  const hitIndex = Math.min(...queryTerms.map(term => {
    const index = lowerContent.indexOf(term.toLocaleLowerCase('uz'));
    return index < 0 ? Number.MAX_SAFE_INTEGER : index;
  }));
  const start = Math.max(0, (hitIndex !== Number.MAX_SAFE_INTEGER ? hitIndex : 0) - 160);
  const excerpt = content.slice(start, start + 900).trim();
  const prefix = start > 0 ? '…' : '';
  const suffix = start + excerpt.length < content.length ? '…' : '';
  return `${prefix}${excerpt}${suffix}`;
}

function tokenize(text: string): string[] {
  const tokens = text.toLocaleLowerCase('uz')
    .replace(/[ʻʼ‘’`']/g, '')
    .replace(/[^\p{L}\p{N}.-]/gu, ' ')
    .split(/\s+/)
    .map(normalizeToken)
    .filter(term => term.length > 2 && !STOP_WORDS.has(term));
  return [...new Set(tokens)];
}

function normalizeToken(token: string): string {
  let normalized = token;
  for (let pass = 0; pass < 2; pass += 1) {
    const suffix = UZBEK_SUFFIXES.find(candidate => normalized.endsWith(candidate) && normalized.length - candidate.length >= 3);
    if (!suffix) break;
    normalized = normalized.slice(0, -suffix.length);
  }
  return normalized;
}

function expandSynonyms(terms: string[]): string[] {
  const map: Record<string, string[]> = {
    'bosim': ['pressure', 'mpa', 'bar', 'datchik', 'sensor'],
    'sensor': ['datchik', 'transducer'], 'datchik': ['sensor', 'transducer'],
    'mikrokontroller': ['esp32', 'stm32', 'mcu'], 'robot': ['amr', 'shassi'],
    'motor': ['bldc', 'reduktor'], 'optika': ['spektrometr', 'lazer']
  };
  return [...new Set(terms.flatMap(term => map[term] || []))];
}
