import { cyrillicToLatin } from './transliterate';

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

    // Doim o'zbek tiliga mos transliteratsiya va tozalash
    const cleanText = cyrillicToLatin(
      text
        .replace(/\[S\d+\]/g, '')
        .replace(/[*#_`]/g, '')
        .trim()
        .slice(0, 1500)
    );

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
