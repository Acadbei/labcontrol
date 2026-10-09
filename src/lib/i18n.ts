/**
 * LabControl i18n - UZ Latin / UZ Cyrillic tarjima lugʻati
 */

export type ScriptMode = 'latin' | 'cyrillic';

export const translations: Record<string, string> = {
  // Navigation
  'Boshqaruv Paneli': 'Boshqaruv Paneli',
  'Loyihalar': 'Loyihalar',
  'Bilimlar Bazasi': 'Bilimlar Bazasi',
  'Hujjatlar Tahlili': 'Hujjatlar Tahlili',
  'Vazifalar': 'Vazifalar',
  'Laboratoriya Jamoasi': 'Laboratoriya Jamoasi',
  'Tahliliy Hisobotlar': 'Tahliliy Hisobotlar',
  'Faollik Jurnali': 'Faollik Jurnali',
  'Tizim Sozlamalari': 'Tizim Sozlamalari',
  'Asosiy Modullar': 'Asosiy Modullar',
  'LabControl Yordamchi': 'LabControl Yordamchi',

  // Projects
  'Yangi Loyiha': 'Yangi Loyiha',
  'Barcha Loyihalar': 'Barcha Loyihalar',
  'Faol': 'Faol',
  'Sinovda': 'Sinovda',
  'Rejalashtirilgan': 'Rejalashtirilgan',
  'Yakunlangan': 'Yakunlangan',
  'Loyihani tanlang': 'Loyihani tanlang',
  'Taxminiy mablag': 'Taxminiy mablag\'',
  'Aktivlik holati': 'Aktivlik holati',
  'Progress': 'Progress',
  'Muddat': 'Muddat',
  'xodim': 'xodim',
  'hujjat': 'hujjat',
  'Tahrirlash': 'Tahrirlash',
  'Saqlash': 'Saqlash',
  'Bekor qilish': 'Bekor qilish',
  'Holati': 'Holati',
  'Tavsif': 'Tavsif',
  'Loyiha Nomi': 'Loyiha Nomi',
  'Loyiha Kodi': 'Loyiha Kodi',
  'Jami': 'Jami',

  // Status
  'Faol emas': 'Faol emas',
  'Kutilmoqda': 'Kutilmoqda',
  'Yakunlandi': 'Yakunlandi',
  'Muzlatilgan': 'Muzlatilgan',

  // Priority
  'Ustuvorlik': 'Ustuvorlik',
  'Yuqori': 'Yuqori',
  'Past': 'Past',

  // System
  'Sessiya tasdiqlandi': 'Sessiya tasdiqlandi',
  'Tizim holati:': 'Tizim holati:',
  'Modullar menyusi': 'Modullar menyusi',
};

export function getActivityStatusInfo(status?: string, mode: ScriptMode = 'latin') {
  const statuses: Record<string, { latin: string; cyrillic: string; color: string; bg: string; dot: string }> = {
    active:    { latin: 'Faol', cyrillic: '\u0424\u0430\u043e\u043b', color: 'text-emerald-400', bg: 'bg-emerald-950/50 border-emerald-800/60', dot: 'bg-emerald-400' },
    inactive:  { latin: 'Faol emas', cyrillic: '\u0424\u0430\u043e\u043b \u044d\u043c\u0430\u0441', color: 'text-slate-400', bg: 'bg-slate-900/50 border-slate-700/60', dot: 'bg-slate-500' },
    pending:   { latin: 'Kutilmoqda', cyrillic: '\u041a\u0443\u0442\u0438\u043b\u043c\u043e\u049b\u0434\u0430', color: 'text-amber-400', bg: 'bg-amber-950/50 border-amber-800/60', dot: 'bg-amber-400 animate-pulse' },
    completed: { latin: 'Yakunlandi', cyrillic: '\u042f\u043a\u0443\u043d\u043b\u0430\u043d\u0434\u0438', color: 'text-blue-400', bg: 'bg-blue-950/50 border-blue-800/60', dot: 'bg-blue-400' },
    suspended: { latin: 'Muzlatilgan', cyrillic: '\u041c\u0443\u0437\u043b\u0430\u0442\u0438\u043b\u0433\u0430\u043d', color: 'text-rose-400', bg: 'bg-rose-950/50 border-rose-800/60', dot: 'bg-rose-400' },
  };
  const info = statuses[status || 'pending'] || statuses['pending'];
  return {
    ...info,
    labelText: mode === 'latin' ? info.latin : info.cyrillic,
  };
}

export function formatBudget(amount?: number, currency?: string): string {
  if (amount === undefined || amount === null) return '';
  const cur = currency || 'UZS';
  if (cur === 'UZS') {
    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} mlrd so'm`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} mln so'm`;
    if (amount >= 1_000) return `${Math.round(amount / 1_000)} ming so'm`;
    return `${amount.toLocaleString()} so'm`;
  }
  return `${amount.toLocaleString()} ${cur}`;
}
