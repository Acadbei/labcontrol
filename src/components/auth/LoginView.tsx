'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { AlertCircle, KeyRound, Moon, Shield, Sun, Languages } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export function LoginView() {
  const { theme, toggleTheme, scriptMode, toggleScriptMode, t, login } = useApp();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(identifier, password);
    } catch (loginError: any) {
      setError(loginError?.message || t('Tizimga kirib bo‘lmadi'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col p-4 sm:p-6 bg-tech-grid">
      <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Shield className="w-4 h-4 text-cyan-400" /> {t('Tizimga kirish')}
        </span>
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm">
            <button
              onClick={() => scriptMode !== 'latin' && toggleScriptMode()}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ${
                scriptMode === 'latin'
                  ? 'liquid-btn-primary text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lotin alifbosi (O‘zbekcha)"
            >
              UZ
            </button>
            <button
              onClick={() => scriptMode !== 'cyrillic' && toggleScriptMode()}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold font-mono transition-all ${
                scriptMode === 'cyrillic'
                  ? 'liquid-btn-primary text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Кирилл алифбоси (Ўзбекча)"
            >
              ЎЗ
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl liquid-btn-ghost text-slate-300 hover:text-cyan-400"
            aria-label={t('Rang mavzusini almashtirish')}
            aria-pressed={theme === 'dark'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          </button>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto my-auto py-8">
        <section className="neu-card p-6 sm:p-8 animate-modal-in">
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-2xl p-1 bg-slate-900/80 border border-cyan-500/40 shadow-glow-cyan mx-auto mb-3 flex items-center justify-center">
              <Image src="/logo.png" alt="LabControl" width={56} height={56} priority className="w-full h-full object-contain rounded-xl" />
            </div>
            <h1 className="brand-title text-2xl font-extrabold text-slate-100">LabControl</h1>
            <p className="text-xs text-slate-400 mt-1">{t('Tashkilot hisob qaydnomasi bilan kiring')}</p>
          </div>

          <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                {t('Tashkilot login identifikatori yoki elektron pochta')}
              </label>
              <input
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                maxLength={254}
                value={identifier}
                onChange={event => setIdentifier(event.target.value)}
                className="w-full px-3.5 py-2.5 text-xs liquid-input focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">
                {t('Parol')}
              </label>
              <input
                type="password"
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                onChange={event => setPassword(event.target.value)}
                className="w-full px-3.5 py-2.5 text-xs liquid-input focus:outline-none"
              />
            </div>

            {error && (
              <p role="alert" className="p-3 rounded-xl bg-rose-950/50 border border-rose-900 text-rose-300 text-xs flex items-center gap-2 animate-fade-in-up">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-3 liquid-btn-primary text-slate-100 font-bold text-xs disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              {busy ? t('Tekshirilmoqda…') : t('Tizimga kirish')}
            </button>
          </form>

          <p className="text-[11px] leading-5 text-slate-500 mt-5 text-center">
            {t('Xodim loginlari')} <code>ism_familiya</code> {t('shaklida. Kirish uchun serverda Argon2id paroli sozlangan bo‘lishi kerak.')}
          </p>
        </section>
      </div>
    </main>
  );
}
