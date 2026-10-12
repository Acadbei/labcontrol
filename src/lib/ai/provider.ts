import { db } from '@/lib/db';
import { ChatMessage, Citation, SystemSettings } from '@/types';
import { RetrievedSource } from '@/lib/ai/rag';

export interface AIResponse {
  content: string;
  citations: Citation[];
  providerUsed: string;
}

export interface AIProvider {
  testConnection(): Promise<{ success: boolean; message: string; models?: string[] }>;
  chat(
    prompt: string,
    history: ChatMessage[],
    sources: RetrievedSource[],
    systemPrompt?: string,
    options?: { useAsadbekGpt?: boolean; script?: 'latin' | 'cyrillic' }
  ): Promise<AIResponse>;
}

export const NOT_FOUND = 'Ichki hujjatlar va bilimlar bazasida bu savolga mos ma’lumot topilmadi. AsadbekGPT orqali qidirilsinmi?';
const INSUFFICIENT_SOURCE_TOKEN = '[[INSUFFICIENT_SOURCE]]';

function citationsForSources(sources: RetrievedSource[]): Citation[] {
  return sources.map(source => ({
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    documentId: source.sourceType === 'document' ? source.sourceId : '',
    knowledgeId: source.sourceType === 'knowledge' ? source.sourceId : undefined,
    documentTitle: source.title,
    originalName: source.label,
    chunkId: source.chunkId,
    pageOrSlide: source.page,
    snippet: source.text,
    verified: source.verified
  }));
}

function extractiveAnswer(sources: RetrievedSource[], providerUsed = 'Hujjatlar va bilimlar bazasi'): AIResponse {
  if (!sources.length) return { content: NOT_FOUND, citations: [], providerUsed: 'Ichki manbalar' };
  // Faqat eng muhim 1-2 ta manbadan qisqa, lo'nda ma'lumot (maksimal 700-800 belgi)
  const topSources = sources.slice(0, 2);
  const excerpts = topSources.map(source => {
    const raw = source.text.trim().replace(/\s+/g, ' ');
    const shortSnippet = raw.length > 280 ? `${raw.slice(0, 275)}...` : raw;
    return `• ${shortSnippet}\n  (Manba: ${source.title})`;
  }).join('\n\n');
  return {
    content: `Ichki manbalardan topilgan asosiy ma’lumot:\n\n${excerpts}`,
    citations: citationsForSources(topSources),
    providerUsed
  };
}

function fallbackToExtracts(sources: RetrievedSource[]): AIResponse {
  return extractiveAnswer(sources, 'Ichki manba parchalari');
}

export class ExtractiveSourceProvider implements AIProvider {
  async testConnection() {
    try {
      db.getChunks();
      return { success: true, message: 'Manba ajratish xizmati ishlamoqda; generativ model ulanmagan.' };
    } catch {
      return { success: false, message: 'Manba omborini o‘qib bo‘lmadi.' };
    }
  }

  async chat(_prompt: string, _history: ChatMessage[], sources: RetrievedSource[]): Promise<AIResponse> {
    return extractiveAnswer(sources);
  }
}

export class OllamaProvider implements AIProvider {
  constructor(private readonly baseUrl: string, private readonly model: string) {}

  private getSafeBaseUrl(): URL {
    const url = new URL(this.baseUrl);
    const allowedHosts = new Set(['localhost', '127.0.0.1', '::1', ...(process.env.OLLAMA_ALLOWED_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean)]);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || !allowedHosts.has(url.hostname)) {
      throw new Error('Ollama manzili ruxsat etilgan host ro‘yxatida emas');
    }
    url.pathname = url.pathname.replace(/\/$/, '');
    url.search = '';
    url.hash = '';
    return url;
  }

  async testConnection() {
    try {
      const base = this.getSafeBaseUrl();
      const response = await fetch(new URL('/api/tags', base), { signal: AbortSignal.timeout(4000), redirect: 'error', cache: 'no-store' });
      if (!response.ok) return { success: false, message: `Ollama javobi: HTTP ${response.status}` };
      const data: any = await response.json();
      const models = Array.isArray(data.models) ? data.models.map((item: any) => item?.name).filter((name: any) => typeof name === 'string') : [];
      const hasModel = models.some((name: string) => name === this.model || name.startsWith(`${this.model}:`));
      return { success: hasModel, message: hasModel ? `Ollama ishlayapti va ${this.model} modeli mavjud.` : `Ollama javob berdi, ammo ${this.model} modeli topilmadi.`, models };
    } catch (error: any) {
      return { success: false, message: error?.name === 'TimeoutError' ? 'Ollama tekshiruvi vaqti tugadi.' : 'Ollama xizmatiga ulanib bo‘lmadi.' };
    }
  }

  async chat(
    prompt: string,
    _history: ChatMessage[],
    sources: RetrievedSource[],
    systemPrompt?: string,
    options?: { useAsadbekGpt?: boolean; script?: 'latin' | 'cyrillic' }
  ): Promise<AIResponse> {
    if (!this.model.trim() || this.model.length > 120) return fallbackToExtracts(sources);

    try {
      const base = this.getSafeBaseUrl();
      const isAsadbekGpt = options?.useAsadbekGpt || /\b(asadbekgpt|acadbekgpt|asadbek gpt|acadbek gpt)\b/i.test(prompt);

      if (isAsadbekGpt || !sources.length) {
        if (!isAsadbekGpt && !sources.length) {
          return { content: NOT_FOUND, citations: [], providerUsed: `Ollama · ${this.model}` };
        }

        const asadbekPrompt = options?.script === 'cyrillic'
          ? 'Сен АсадбекГПТ (AcadbekGPT) — ЛабКонтрол тизимининг маҳаллий сунъий интеллект моделисан (Ollama qwen2.5:7b). Фойдаланувчи саволига ўзбек тилида (кирилл алифбосида) аниқ, лўнда, чуқур ва тез жавоб бер.'
          : 'Sen AsadbekGPT (AcadbekGPT) — LabControl tizimining kuchli mahalliy sun’iy intellekt modelisan (Ollama qwen2.5:7b). Foydalanuvchi savoliga o‘zbek tilida (lotin alifbosida) aniq, lo‘nda, chuqur va juda tez javob ber.';

        const genResponse = await fetch(new URL('/api/chat', base), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.model,
            stream: false,
            options: { temperature: 0.2, num_predict: 500, num_ctx: 3072 },
            messages: [
              { role: 'system', content: systemPrompt || asadbekPrompt },
              { role: 'user', content: prompt }
            ]
          }),
          signal: AbortSignal.timeout(25_000),
          redirect: 'error',
          cache: 'no-store'
        });
        if (genResponse.ok) {
          const genData: any = await genResponse.json();
          const genAnswer = typeof genData?.message?.content === 'string' ? genData.message.content.trim() : '';
          if (genAnswer) {
            return { content: genAnswer, citations: [], providerUsed: `AsadbekGPT (Ollama · ${this.model})` };
          }
        }
        return { content: NOT_FOUND, citations: [], providerUsed: `Ollama · ${this.model}` };
      }

      const sourceContext = sources.slice(0, 3).map((source, index) => ({
        ref: `S${index + 1}`,
        type: source.sourceType,
        title: source.title,
        label: source.label,
        pageOrSlide: source.page ?? null,
        verified: source.sourceType === 'document' ? source.verified === true : null,
        text: source.text.slice(0, 600)
      }));
      const instructions = [
        'Sen LabControl laboratoriyasining ichki yordamchisisan.',
        'Faqat berilgan SOURCES ichidagi tekshiriladigan ma’lumotlardan foydalanib o‘zbek tilida javob ber.',
        'MUHIM QAT’IY TALAB: Javobing ko‘pi bilan 3-4 jumla va maksimal 600-800 belgidan oshmasin! Juda qisqa, lo‘nda, aniq va amaliy javob ber. Hech qachon cho‘zib yozma, umumiy gaplar qo‘shma.',
        'Foydalangan har bir fakt yoki ro‘yxat bandi yonida unga mos [S1] kabi manba belgisini qo‘y.',
        'Hujjat manbasida verified=false bo‘lsa, uni tasdiqlanmagan deb ochiq ayt.',
        `Agar manbalar savolga umuman javob bermasa, faqat ${INSUFFICIENT_SOURCE_TOKEN} deb yoz.`
      ].join(' ');

      const response = await fetch(new URL('/api/chat', base), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          options: { temperature: 0.15, num_predict: 250, num_ctx: 2048 },
          messages: [
            { role: 'system', content: systemPrompt ? `${instructions} ${systemPrompt}` : instructions },
            { role: 'user', content: JSON.stringify({ question: prompt, sources: sourceContext }) }
          ]
        }),
        signal: AbortSignal.timeout(20_000),
        redirect: 'error',
        cache: 'no-store'
      });
      if (!response.ok) return fallbackToExtracts(sources);

      const data: any = await response.json();
      const rawAnswer: string = typeof data?.message?.content === 'string' ? data.message.content.trim() : '';
      if (!rawAnswer) return fallbackToExtracts(sources);
      if (rawAnswer.includes(INSUFFICIENT_SOURCE_TOKEN)) {
        return { content: NOT_FOUND, citations: [], providerUsed: `Ollama · ${this.model}` };
      }

      const usedIndexes = new Set<number>();
      let content = rawAnswer.replace(/\[S(\d+)\]/g, (marker: string, rawIndex: string) => {
        const index = Number(rawIndex);
        if (!Number.isInteger(index) || index < 1 || index > sourceContext.length) return '';
        usedIndexes.add(index - 1);
        return marker;
      }).trim();

      if (content.length > 900) {
        content = content.slice(0, 900).replace(/\s+[^\s]*$/, '') + '...';
      }

      const matchedCitations = usedIndexes.size
        ? citationsForSources([...usedIndexes].sort((left, right) => left - right).map(index => sources[index]))
        : citationsForSources(sources.slice(0, 2));

      return {
        content,
        citations: matchedCitations,
        providerUsed: `Ollama · ${this.model}`
      };
    } catch {
      return fallbackToExtracts(sources);
    }
  }
}

export class OpenRouterProvider implements AIProvider {
  constructor(private readonly apiKey: string, private readonly model = 'openrouter/free') {}

  async testConnection() {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: AbortSignal.timeout(8000),
        redirect: 'error',
        cache: 'no-store'
      });
      return response.ok
        ? { success: true, message: 'OpenRouter bilan aloqa ishlamoqda.', models: [this.model] }
        : { success: false, message: response.status === 429 ? 'OpenRouter so‘rovlari vaqtincha cheklangan.' : 'OpenRouter kaliti tekshirilmadi.' };
    } catch (error: any) {
      return { success: false, message: error?.name === 'TimeoutError' ? 'OpenRouter tekshiruvi vaqti tugadi.' : 'OpenRouter’ga ulanib bo‘lmadi.' };
    }
  }

  async chat(prompt: string, history: ChatMessage[], sources: RetrievedSource[]): Promise<AIResponse> {
    const sourceContext = sources.slice(0, 4).map((source, index) => ({
      ref: `S${index + 1}`,
      type: source.sourceType,
      title: source.title,
      label: source.label,
      pageOrSlide: source.page ?? null,
      verified: source.sourceType === 'document' ? source.verified === true : null,
      text: source.text.slice(0, 600)
    }));
    const instructions = [
      'Sen LabControl laboratoriyasining ichki yordamchisisan.',
      'Faqat berilgan SOURCES ichidagi tekshiriladigan dalillarga tayanib o‘zbek tilida javob ber.',
      'MUHIM QAT’IY TALAB: Javobing maksimal 3-4 ta jumladan va ko‘pi bilan 600-800 belgidan oshmasin! Juda ixcham, aniq va amaliy javob ber. Hech qachon cho‘zib yozma, umumiy gaplar va keraksiz ro‘yxatlar qilma.',
      'Manbadan olingan har bir muhim fakt oxirida [S1] kabi to‘g‘ri manba belgisini qo‘y. Ichki savolga manba yetarli bo‘lmasa, boshqa matn qo‘shmay faqat [[INSUFFICIENT_SOURCE]] deb javob ber.',
      'Xodimning imkoniyati yoki mas’uliyatini faqat ko‘rsatilgan lavozim, loyiha jamoasi va vazifa biriktiruvidan kelib chiqib ayt; vazifa biriktirilmagan bo‘lsa, buni aniq ko‘rsat.',
      'Loyiha holati va “bu yerda nima bo‘ldi” savollarida tegishli vazifa izohlari hamda faoliyat yozuvlarining sanasiga tayan.'
    ].join(' ');

    const recentHistory = history
      .filter(message => (message.role === 'user' || message.role === 'assistant') && typeof message.content === 'string')
      .slice(-6)
      .map(message => ({ role: message.role, content: message.content.slice(0, 800) }));
    while (recentHistory.length && recentHistory[0].role !== 'user') recentHistory.shift();

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: instructions },
          ...recentHistory,
          { role: 'user', content: JSON.stringify({ question: prompt, sources: sourceContext }) }
        ],
        temperature: 0.2,
        max_tokens: 300,
        stream: false
      }),
      signal: AbortSignal.timeout(25_000),
      redirect: 'error',
      cache: 'no-store'
    });
    if (!response.ok) {
      const error: any = new Error('OpenRouter javobi olinmadi');
      error.status = response.status;
      throw error;
    }

    const data: any = await response.json();
    const message = data?.choices?.[0]?.message?.content;
    const rawAnswer = (typeof message === 'string'
      ? message
      : Array.isArray(message)
        ? message.filter((part: any) => part?.type === 'text' && typeof part?.text === 'string').map((part: any) => part.text).join('\n')
        : '').trim();
    if (!rawAnswer) throw new Error('OpenRouter matnli javob qaytarmadi');
    if (rawAnswer.includes(INSUFFICIENT_SOURCE_TOKEN)) return { content: NOT_FOUND, citations: [], providerUsed: `OpenRouter · ${this.model}` };

    const usedIndexes = new Set<number>();
    let content = rawAnswer.replace(/\[S(\d+)\]/g, (marker: string, rawIndex: string) => {
      const index = Number(rawIndex);
      if (!Number.isInteger(index) || index < 1 || index > sourceContext.length) return '';
      usedIndexes.add(index - 1);
      return marker;
    }).trim();

    if (content.length > 900) {
      content = content.slice(0, 900).replace(/\s+[^\s]*$/, '') + '...';
    }

    if (sourceContext.length) {
      const paragraphs = content.split(/\n\s*\n/).map(paragraph => paragraph.trim()).filter(Boolean);
      if (!usedIndexes.size || !paragraphs.length || !paragraphs.every(paragraph => /\[S\d+\]/.test(paragraph))) {
        return fallbackToExtracts(sources);
      }
    }

    const citations = citationsForSources([...usedIndexes].sort((left, right) => left - right).map(index => sources[index]));
    return { content, citations, providerUsed: `OpenRouter · ${this.model}` };
  }
}

export function getAIProvider(settings: SystemSettings): AIProvider {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return new OpenRouterProvider(openRouterKey, process.env.LABCONTROL_OPENROUTER_MODEL || 'openrouter/free');
  }
  if (settings.aiProvider === 'ollama') {
    return new OllamaProvider(process.env.OLLAMA_URL || settings.ollamaUrl, settings.modelName);
  }
  return new ExtractiveSourceProvider();
}
