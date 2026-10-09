'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Settings,
  Cpu,
  Database,
  Download,
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  HardDrive,
  Shield,
  Layers,
  Sparkles,
  Sun,
  Moon,
  AlertTriangle,
  Lock,
  Languages
} from 'lucide-react';
import { SystemSettings } from '@/types';

export function SettingsView() {
  const {
    currentUser,
    theme,
    toggleTheme,
    scriptMode,
    setScriptMode,
    t
  } = useApp();

  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backupError, setBackupError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error('Settings fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiProvider: settings.aiProvider, modelName: settings.modelName })
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3500);
      } else {
        const err = await res.json();
        setSaveError(err.error || t('Sozlamalarni saqlashda xatolik yuz berdi'));
      }
    } catch (e: any) {
      console.error('Save settings error:', e);
      setSaveError(e?.message || t('Server bilan bog‘lanishda xatolik'));
    }
  };

  const handleTestOllama = async () => {
    if (!settings) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          aiProvider: settings.aiProvider,
          ollamaUrl: settings.ollamaUrl,
          modelName: settings.modelName
        })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e: any) {
      setTestResult({ success: false, message: e?.message || t('Ulanishda xatolik yuz berdi') });
    } finally {
      setIsTesting(false);
    }
  };

  const handleBackupDownload = async () => {
    setBackupError(null);
    try {
      const res = await fetch('/api/backup', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        setBackupError(err.error || t('Zaxirani yuklab olish taqiqlandi (403)'));
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lab-control-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (e: any) {
      setBackupError(e?.message || t('Yuklab olishda xatolik'));
    }
  };

  if (loading || !settings) {
    return (
      <div className="neu-card p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400 font-mono">{t('Sozlamalar yuklanmoqda...')}</p>
      </div>
    );
  }

  const canManageSettings = currentUser?.permissions?.includes('system.settings') ?? false;

  return (
    <div className="space-y-6">
      {/* Top Banner - Liquid 3D Neumorphism */}
      <div className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <Settings className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Tizim va AI Sozlamalari')} (Configuration)
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Manba qidiruvi, lokal model ulanishi va zaxira nusxalari')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveSuccess && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 font-semibold animate-fade-in-up">
              <CheckCircle className="w-4 h-4" /> {t('Sozlamalar saqlandi')}
            </span>
          )}
          {saveError && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 font-semibold animate-fade-in-up">
              <AlertCircle className="w-4 h-4" /> {saveError}
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section: Language & Script Selection (UZ Latin / UZ Cyrillic) */}
        <div className="neu-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <Languages className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">{t('Til va Yozuv Tizimi (Lotin / Кирилл)')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('Interfeysdagi barcha matnlar, sarlavhalar va formalarni O‘zbek lotin yoki kirill alifbosida ko‘rsatish')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                {t('Faol alifbo:')} {scriptMode === 'latin' ? "Lotin (O'zbekcha)" : "Кирилл (Ўзбекча)"}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Tanlov darhol saqlanadi va sahifani qayta yuklash talab etilmaydi')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setScriptMode('latin')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scriptMode === 'latin'
                    ? 'liquid-btn-primary text-slate-100'
                    : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
                }`}
              >
                Lotin (O‘zbekcha)
              </button>
              <button
                type="button"
                onClick={() => setScriptMode('cyrillic')}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  scriptMode === 'cyrillic'
                    ? 'liquid-btn-primary text-slate-100'
                    : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
                }`}
              >
                Кирилл (Ўзбекча)
              </button>
            </div>
          </div>
        </div>

        {/* Section 0: Theme / Appearance */}
        <div className="neu-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            {theme === 'dark' ? <Moon className="w-5 h-5 text-cyan-400" /> : <Sun className="w-5 h-5 text-amber-500" />}
            <div>
              <h2 className="text-sm font-bold text-slate-200">{t('Interfeys Rejimi (Mavzu / Theme)')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('Kunduzgi va tungi laboratoriya yoritilishiga mos interfeys ko‘rinishi')}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-slate-800 gap-3">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">
                {t('Hozirgi rejim:')} {theme === 'dark' ? t('Tungi rejim (Qorong‘u laboratoriya)') : t('Kunduzgi rejim (Yorug‘lik rejimi)')}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Yuqori panelidagi quyosh/oy tugmasi orqali ham darhol almashtirish mumkin')}
              </p>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-xl liquid-btn-ghost text-slate-200 text-xs font-semibold"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span>{t('Kunduzgi rejimga o‘tish')}</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-cyan-400" />
                  <span>{t('Tungi rejimga o‘tish')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 1: AI Provider Abstraction */}
        <div className="neu-card p-6 space-y-5">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">{t('AI Provider Abstraction & Model Parametrlari')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('Hujjat manbalari qidiruvi va serverda sozlangan lokal model')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {t('Faol AI Provider')}
              </label>
              <select
                value={settings.aiProvider}
                onChange={e => setSettings({ ...settings, aiProvider: e.target.value as any })}
                className="w-full px-3.5 py-2.5 text-xs liquid-input focus:outline-none"
              >
                <option value="local_extractive">{t('Hujjat manbalaridan ajratib ko‘rsatish')}</option>
                <option value="ollama">Ollama {t('modeli (serverda sozlanadi)')}</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                {t('Manba ajratish rejimi generativ AI emas. Hujjat topilmasa, tizim taxmin qilmaydi.')}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {t('Model Nomi')}
              </label>
              <input
                type="text"
                value={settings.modelName}
                onChange={e => setSettings({ ...settings, modelName: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs liquid-input font-mono focus:outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                {t('Model nomini server administratori va provider bilan moslang.')}
              </p>
            </div>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                onClick={handleTestOllama}
                disabled={isTesting}
                className="w-full py-2.5 px-4 rounded-xl liquid-btn-ghost text-cyan-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                {isTesting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('Ulanish tekshirilmoqda...')}</span>
                  </>
                ) : settings.aiProvider === 'local_extractive' ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('Manba ajratish rejimi model tekshirmaydi')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('Ollama Ulanishini Sinash')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Connection Test Result Alert */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 animate-fade-in-up ${
                testResult.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{testResult.success ? t('Ulanish Muvaffaqiyatli') : t('Ulanish Amalga Oshmadi')}</p>
                <p className="text-[11px] mt-0.5 opacity-90">{testResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Document search */}
        <div className="neu-card p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800/80">
            <Database className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-200">{t('Hujjat manbalarini qidirish')}</h2>
              <p className="text-[11px] text-slate-400">
                {t('Tasdiqlangan hujjat matnidagi so‘z mosliklari bilan qidiruv')}
              </p>
            </div>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('Hozir embedding yoki vektor ombori sozlanmagan. Javoblarda faqat alohida tasdiqlangan hujjat parchalariga havola beriladi.')}
          </p>
        </div>

        {/* Section 3: Data Backup & Export with RBAC */}
        <div className="neu-card p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <div>
                <h2 className="text-sm font-bold text-slate-200">{t('Tizimni Zaxiralash (Backup & Restore)')}</h2>
                <p className="text-[11px] text-slate-400">
                  {t('Barcha loyihalar, vazifalar, hujjatlar va audit qaydlarini xavfsiz eksport qilish (Faqat Admin / Super Admin)')}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleBackupDownload}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs shadow-md whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              <span>{t('Zaxira Nusxasini Yuklab Olish (JSON)')}</span>
            </button>
          </div>

          {backupError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
              <Lock className="w-4 h-4 flex-shrink-0" />
              <span>{backupError}</span>
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {!canManageSettings && (
            <p className="text-xs text-amber-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              {t('Sozlamalarni saqlash faqat Admin va Super Admin uchun ruxsat etilgan.')}
            </p>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={!canManageSettings}
              className={`flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all ${
                canManageSettings
                  ? 'liquid-btn-primary text-slate-100 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>{t('Sozlamalarni Saqlash')}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
