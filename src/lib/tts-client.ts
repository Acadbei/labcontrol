import { cyrillicToLatin } from './transliterate';

/**
 * Matnning eng muhim qismini (1000 belgidan oshmaydigan) nutq uchun tayyorlaydi.
 * Markdown, havolalar, manbalar, kodlar, emojilarni tozalaydi va
 * jumlalar chegarasi bo'yicha tabiiy qisqartiradi.
 */
export function extractSpeechSummary(rawText: string, maxLen: number = 1000): string {
  if (!rawText || typeof rawText !== 'string') return '';

  const text = rawText
    // Kod bloklari va jadvallarni olib tashlash
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\|[^\n]+\|/g, ' ')
    // Manba havolalari va maxsus tokenlar: [S1], [K1], [[INSUFFICIENT_SOURCE]]
    .replace(/\[(?:S|K|Doc|Manba)\d+[^\]]*\]/gi, '')
    .replace(/\[\[.*?\]\]/g, '')
    // Markdown havolalari: [matn](url) -> matn
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Xom URL'lar
    .replace(/https?:\/\/\S+/g, '')
    // Tugma bosish haqidagi texnik ko'rsatmalarni o'qimaslik
    .replace(/Vazifani tizimga kiritish uchun quyidagi[^\n.]*/gi, '')
    // Emojilar va piktogrammalarni tozalash
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '')
    // Markdown belgilari (*, #, _, ~, >, `)
    .replace(/[*#_~>`]/g, ' ')
    // Ro'yxat markerlari (-, •, 1.)
    .replace(/^\s*[-•+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // Probellarni va qatorlarni tekislash
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, '. ')
    .replace(/\s*\.\s*/g, '. ')
    .replace(/\.+/g, '.')
    .trim();

  if (!text) return '';

  if (text.length <= maxLen) {
    return text;
  }

  // Jumlalar bo'yicha eng muhim qismini 1000 belgidan oshmaydigan qilib yig'ish
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

  const acc: string[] = [];
  let currLen = 0;

  for (const s of sentences) {
    const addLen = s.length + (acc.length > 0 ? 1 : 0);
    if (currLen + addLen <= maxLen) {
      acc.push(s);
      currLen += addLen;
    } else {
      break;
    }
  }

  if (acc.length > 0) {
    return acc.join(' ');
  }

  // Agar birinchi jumlaning o'zi maxLen dan uzun bo'lsa, so'z chegarasidan qirqamiz
  const cut = text.slice(0, maxLen - 4);
  const lastSpace = cut.lastIndexOf(' ');
  const safeText = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  return `${safeText.trim()}.`;
}

export class PcmAudioStreamPlayer {
  private readonly abortController = new AbortController();
  private currentAudio: HTMLAudioElement | null = null;
  private stopped = false;
  private resolvePlayback?: () => void;

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  stop() {
    if (this.stopped) return;
    this.stopped = true;
    this.abortController.abort();
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch {}
    }
    this.resolvePlayback?.();
  }

  async play(response: Response, fallbackText?: string): Promise<void> {
    if (this.stopped) return;
    try {
      if (!response.ok) {
        throw new Error(`TTS server xatosi: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Audio ma’lumoti bo‘sh qaytdi');
      }

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      this.currentAudio = audio;

      await new Promise<void>((resolve, reject) => {
        this.resolvePlayback = resolve;
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };
        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Audio ijro etishda xatolik yuz berdi'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      if (this.stopped) return;
      if (fallbackText && typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          await playBrowserSpeech(fallbackText);
          return;
        } catch {
          // Browser speech fallback error ignored
        }
      }
      throw error;
    } finally {
      this.currentAudio = null;
      this.resolvePlayback = undefined;
    }
  }
}

export function playBrowserSpeech(text: string): Promise<void> {
  return new Promise(resolve => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();

    // 1000 belgilik eng muhim qismini olish va lotin alifbosiga o'tkazish
    const speechSummary = extractSpeechSummary(text, 1000);
    const cleanText = cyrillicToLatin(speechSummary);

    if (!cleanText) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'uz-UZ';

    const voices = window.speechSynthesis.getVoices();
    const uzVoice =
      voices.find(v => v.lang.toLowerCase().includes('uz')) ||
      voices.find(v => v.name.toLowerCase().includes('uzbek'));

    if (uzVoice) {
      utterance.voice = uzVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}
