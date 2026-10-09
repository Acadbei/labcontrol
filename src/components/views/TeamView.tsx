'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { MessageSquare, RefreshCw, Send, UserPlus, Users, Lock, Shield } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { TeamChatMessage, UserPosition } from '@/types';
import { MarkdownContent } from '@/components/common/MarkdownContent';

export function TeamView() {
  const { allUsers, currentUser, refreshUser, t, scriptMode } = useApp();
  const canViewTeam = Boolean(currentUser?.permissions.includes('team.view'));
  const canChat = Boolean(currentUser?.permissions.includes('team.chat'));
  const canCreateUsers = Boolean(currentUser?.permissions.includes('users.create'));
  const [activeTab, setActiveTab] = useState<'members' | 'chat'>(canViewTeam ? 'members' : 'chat');
  const [messages, setMessages] = useState<TeamChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPosition, setNewPosition] = useState<UserPosition>('Frontend dasturchi');
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ error: boolean; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canViewTeam && canChat) setActiveTab('chat');
    if (canViewTeam && !canChat) setActiveTab('members');
  }, [canViewTeam, canChat]);

  const loadMessages = useCallback(async () => {
    const response = await fetch('/api/team/chat', { cache: 'no-store' });
    if (!response.ok) throw new Error(t('Guruh xabarlarini yuklab bo‘lmadi'));
    const data = await response.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [t]);

  useEffect(() => { void loadMessages().catch(error => setStatus(error.message)); }, [loadMessages]);
  useEffect(() => {
    if (activeTab === 'chat') scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [activeTab, messages]);

  const sendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || busy) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/team/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: draft.trim() })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('Xabar yuborilmadi'));
      setMessages(items => [...items, data]);
      setDraft('');
    } catch (error: any) { setStatus(error?.message || t('Xabar yuborilmadi')); }
    finally { setBusy(false); }
  };

  const createEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setStatus('');
    try {
      const response = await fetch('/api/team/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, email: newEmail, position: newPosition, password: newPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('Xodim hisobini yaratib bo‘lmadi'));
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setStatus(`${data.user.name} ${t('hisobi yaratildi')}: ${data.user.email}`);
      await refreshUser();
    } catch (error: any) { setStatus(error?.message || t('Xodim hisobini yaratib bo‘lmadi')); }
    finally { setBusy(false); }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordBusy) return;
    if (nextPassword !== confirmPassword) {
      setPasswordFeedback({ error: true, text: t('Yangi parollar mos kelmadi.') });
      return;
    }
    setPasswordBusy(true);
    setPasswordFeedback(null);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword: nextPassword })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('Parolni almashtirib bo‘lmadi'));
      setCurrentPassword('');
      setNextPassword('');
      setConfirmPassword('');
      setPasswordFeedback({ error: false, text: t('Parol yangilandi. Boshqa sessiyalar xavfsizlik uchun bekor qilindi.') });
    } catch (error: any) {
      setPasswordFeedback({ error: true, text: error?.message || t('Parolni almashtirib bo‘lmadi') });
    } finally { setPasswordBusy(false); }
  };

  return (
    <section className="space-y-5 max-w-full overflow-hidden">
      {/* Header - Neu card */}
      <header className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <Users className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">{t('Laboratoriya Jamoasi')}</h1>
              <p className="text-[11px] text-slate-400 mt-0.5">{canViewTeam ? t('Ruxsatli jamoa katalogi va ichki muloqot.') : t('Ruxsatli guruh muloqoti.')}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2" role="tablist" aria-label={t('Jamoa bo‘limlari')}>
          {canViewTeam && (
            <button
              role="tab"
              aria-selected={activeTab === 'members'}
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'members' ? 'liquid-btn-primary text-slate-100' : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
              }`}
            >
              {t('A’zolar')} ({allUsers.length})
            </button>
          )}
          {canChat && (
            <button
              role="tab"
              aria-selected={activeTab === 'chat'}
              onClick={() => setActiveTab('chat')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
                activeTab === 'chat' ? 'liquid-btn-primary text-slate-100' : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t('Guruh muloqoti')}
            </button>
          )}
        </div>
      </header>

      {/* Account Security - Password Change */}
      <form onSubmit={changePassword} className="neu-card p-5 sm:p-6 space-y-4">
        <div>
          <h2 className="font-bold text-sm text-slate-200">{t('Hisob xavfsizligi')}</h2>
          <p className="text-xs text-slate-400 mt-1">{t('Boshlang‘ich parolni olganingizdan so‘ng shu yerda o‘zingizga tegishli yangi parolni o‘rnating.')}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Amaldagi parol')}</label>
            <input
              type="password"
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              required
              maxLength={1024}
              autoComplete="current-password"
              className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Yangi parol (kamida 12 belgi)')}</label>
            <input
              type="password"
              value={nextPassword}
              onChange={event => setNextPassword(event.target.value)}
              required
              minLength={12}
              maxLength={1024}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Yangi parolni takrorlang')}</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={event => setConfirmPassword(event.target.value)}
              required
              minLength={12}
              maxLength={1024}
              autoComplete="new-password"
              className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
            />
          </div>
        </div>
        {passwordFeedback && (
          <p role="status" className={`text-xs font-semibold ${passwordFeedback.error ? 'text-rose-400' : 'text-emerald-400'}`}>
            {passwordFeedback.text}
          </p>
        )}
        <button
          type="submit"
          disabled={passwordBusy}
          className="liquid-btn-ghost px-4 py-2.5 text-xs font-semibold text-slate-100 disabled:opacity-50"
        >
          {passwordBusy ? t('Yangilanmoqda…') : t('Parolni almashtirish')}
        </button>
      </form>

      {status && <p role="status" className="text-xs text-rose-400 font-semibold">{status}</p>}

      {activeTab === 'members' && (
        <div className="space-y-4">
          {canCreateUsers && (
            <form onSubmit={createEmployee} className="neu-card p-5 sm:p-6 space-y-4">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-cyan-400" />
                <h2 className="font-bold text-sm text-slate-200">{t('Xodim hisobi yaratish')}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Xodim ismi')}</label>
                  <input
                    value={newName}
                    onChange={event => setNewName(event.target.value)}
                    required
                    minLength={2}
                    maxLength={120}
                    autoComplete="name"
                    className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Elektron pochta')}</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={event => setNewEmail(event.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Lavozim')}</label>
                  <select
                    value={newPosition}
                    onChange={event => setNewPosition(event.target.value as UserPosition)}
                    className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
                  >
                    <option value="Frontend dasturchi">Frontend dasturchi</option>
                    <option value="Umumiy dasturchi">Umumiy dasturchi</option>
                    <option value="Konstruktor, 3D loyihalovchi">Konstruktor, 3D loyihalovchi</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold uppercase text-slate-400 mb-1.5 block">{t('Boshlang‘ich parol')}</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={event => setNewPassword(event.target.value)}
                    required
                    minLength={12}
                    maxLength={1024}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t('Yangi hisob oddiy xodim sifatida yaratiladi. Boshlang‘ich parolni xodimga alohida va xavfsiz yetkazing; xodim tizimga kirgach “Hisob xavfsizligi” bo‘limida parolini almashtirishi mumkin.')}
              </p>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl liquid-btn-primary px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                {t('Hisob yaratish')}
              </button>
            </form>
          )}

          {allUsers.length ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {allUsers.map(user => (
                <article key={user.id} className="neu-card p-4 sm:p-5 flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600/30 to-blue-700/30 border border-cyan-500/30 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden text-cyan-300">
                    {user.avatar ? (
                      <Image src={user.avatar} alt="" width={48} height={48} unoptimized className="w-full h-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-slate-200 truncate">{user.name}</h2>
                    <p className="text-xs text-slate-400 truncate">{user.position ? t(user.position) : ''}</p>
                    <p className="text-[10px] font-mono font-bold uppercase tracking-wide text-cyan-400 mt-1">{user.role}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="neu-card p-8 text-center text-sm text-slate-500">
              {t('Katalog uchun tasdiqlangan jamoa ma’lumoti mavjud emas.')}
            </div>
          )}
        </div>
      )}

      {activeTab === 'chat' && canChat && (
        <div className="neu-card overflow-hidden">
          <div ref={scrollRef} className="h-[min(60vh,620px)] min-h-[280px] overflow-y-auto p-4 sm:p-5 space-y-3" aria-live="polite">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-12">{t('Hozircha guruh xabari yo‘q.')}</p>
            ) : (
              messages.map(message => (
                <article
                  key={message.id}
                  className={`max-w-3xl p-3.5 rounded-2xl border ${
                    message.senderId === currentUser?.id
                      ? 'ml-auto bg-cyan-950/40 border-cyan-800/50 text-slate-200'
                      : 'bg-slate-900/60 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <p className="text-[11px] text-slate-400 mb-1 font-mono">
                    {message.senderName} · {new Date(message.timestamp).toLocaleString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ')}
                  </p>
                  <MarkdownContent content={message.content} />
                </article>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="p-3.5 border-t border-slate-800/80 flex gap-2.5 bg-slate-900/40">
            <input
              value={draft}
              onChange={event => setDraft(event.target.value)}
              maxLength={4000}
              required
              placeholder={t('Xabar yozing...')}
              className="flex-1 min-w-0 px-3.5 py-2.5 text-xs liquid-input focus:outline-none"
            />
            <button
              type="submit"
              aria-label={t('Xabar yuborish')}
              disabled={busy || !draft.trim()}
              className="px-4 py-2.5 rounded-xl liquid-btn-primary text-slate-100 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
            {busy && <RefreshCw className="w-4 h-4 animate-spin self-center text-cyan-400" aria-label={t('Yuborilmoqda')} />}
          </form>
        </div>
      )}
    </section>
  );
}
