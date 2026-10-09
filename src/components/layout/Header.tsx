'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Brain,
  Search,
  Upload,
  PlusCircle,
  UserCheck,
  ChevronDown,
  Sun,
  Moon,
  Menu,
  X,
  SlidersHorizontal,
  LogOut,
  Camera,
  Edit3,
  Save,
  Check,
  RefreshCw,
  Trash2,
  Languages
} from 'lucide-react';

export function Header() {
  const {
    currentUser,
    refreshUser,
    logout,
    activeTab,
    setActiveTab,
    setIsUploadModalOpen,
    setIsNewTaskModalOpen,
    theme,
    toggleTheme,
    scriptMode,
    toggleScriptMode,
    t,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsGlobalSearchOpen
  } = useApp();

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with currentUser when menu opens or user changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditAvatar(currentUser.avatar);
    }
  }, [currentUser, isUserMenuOpen]);

  // Outside click and Escape key listeners to hide the menu when not in use
  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
        setIsEditingProfile(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsUserMenuOpen(false);
        setIsEditingProfile(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  // Handle avatar photo selection and upload
  const handleAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setEditAvatar(base64);

      // Direct auto-save of avatar image
      try {
        setIsSaving(true);
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ avatar: base64 })
        });
        if (res.ok) {
          if (refreshUser) await refreshUser();
          setFeedbackMsg('Profil rasmi muvaffaqiyatli yangilandi!');
          setTimeout(() => setFeedbackMsg(null), 3000);
        }
      } catch (err) {
        console.error('Avatar update error:', err);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Remove avatar photo
  const handleRemoveAvatar = async () => {
    try {
      setIsSaving(true);
      setEditAvatar('');
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: '' })
      });
      if (res.ok) {
        if (refreshUser) await refreshUser();
        setFeedbackMsg('Profil rasmi olib tashlandi');
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('Avatar remove error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save profile information
  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSaving(true);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          avatar: editAvatar || ''
        })
      });

      if (res.ok) {
        if (refreshUser) await refreshUser();
        setIsEditingProfile(false);
        setFeedbackMsg('Ma’lumotlar muvaffaqiyatli saqlandi!');
        setTimeout(() => setFeedbackMsg(null), 3000);
      }
    } catch (err) {
      console.error('Save profile error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full glow-badge-rose">Bosh Rahbar</span>;
      case 'ADMIN':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full glow-badge-amber">Administrator</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-full glow-badge-cyan">Mutaxassis</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-2.5 sm:px-5 py-2 sm:py-2.5">
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 max-w-full">
        {/* Left: Hamburger (mobile) + Brand identity */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-slate-200 transition-all flex-shrink-0 cursor-pointer"
            aria-label="Menyuni ochish"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6 text-cyan-400 stroke-[2.2]" /> : <Menu className="w-6 h-6 stroke-[2.2]" />}
          </button>

          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group flex-shrink-0"
          >
            <div className="relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-slate-900/80 p-0.5 border border-cyan-500/40 shadow-glow-cyan flex-shrink-0 overflow-hidden">
              <Image src="/logo.png" alt="LabControl" width={44} height={44} className="w-full h-full object-contain rounded-full" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="brand-title text-sm sm:text-lg font-extrabold tracking-wider text-black dark:text-slate-200 transition-colors">
                  LabControl
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono tracking-tight hidden sm:block">
                Laboratoriyaning ikkinchi miyasi
              </p>
            </div>
          </div>
        </div>

        {/* Center: Global Search Bar on tablet/desktop */}
        <div className="hidden sm:flex flex-1 max-w-xs sm:max-w-md mx-2">
          <div
            onClick={() => setIsGlobalSearchOpen(true)}
            className="relative cursor-pointer group flex items-center w-full pl-3.5 pr-2.5 sm:pr-3 py-2 text-xs bg-slate-900/80 hover:bg-slate-900 border border-slate-700/70 hover:border-cyan-500/60 rounded-xl text-slate-300 transition-all font-sans shadow-xs"
            role="search"
            aria-label="Global qidiruvni ochish"
          >
            <Search className="w-5 h-5 text-cyan-600 dark:text-cyan-400 group-hover:scale-110 transition-transform mr-2.5 flex-shrink-0 stroke-[2.2]" />
            <span className="truncate text-slate-500 group-hover:text-slate-300 text-[11px] sm:text-xs font-medium">
              Qidiruv: loyihalar, datchiklar, ESP32...
            </span>
            <span className="ml-auto items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700/80 hidden md:flex">
              Ctrl+K
            </span>
          </div>
        </div>

        {/* Right: Actions, Theme Toggle, Mobile Search & User Profile */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Mobile search trigger icon button */}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="sm:hidden p-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
            aria-label="Qidiruvni ochish"
            title="Qidiruv (Ctrl+K)"
          >
            <Search className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Language / Script Toggle (O‘zbekcha Lotin ↔ Кирилл) */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-900/90 border border-slate-700/80 shadow-sm">
            <button
              onClick={() => scriptMode !== 'latin' && toggleScriptMode()}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                scriptMode === 'latin'
                  ? 'liquid-btn-primary text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Lotin alifbosi (O‘zbekcha)"
              aria-label="Lotin alifbosiga o‘tish"
            >
              UZ
            </button>
            <button
              onClick={() => scriptMode !== 'cyrillic' && toggleScriptMode()}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                scriptMode === 'cyrillic'
                  ? 'liquid-btn-primary text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Кирилл алифбоси (Ўзбекча)"
              aria-label="Кирилл алифбосига ўтиш"
            >
              ЎЗ
            </button>
          </div>

          {/* Theme Toggle (Kunduzgi / Tungi rejim) */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl liquid-btn-ghost text-slate-300 hover:text-cyan-400 transition-all flex items-center justify-center cursor-pointer shadow-xs"
            title={theme === 'dark' ? t('Kunduzgi rejimga o‘tish') : t('Tungi rejimga o‘tish')}
            aria-label={t('Rejimni almashtirish')}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400 stroke-[2.2]" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-500 stroke-[2.2]" />
            )}
          </button>

          {/* Quick upload button */}
          {currentUser?.permissions.includes('documents.upload') && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-600/15 dark:bg-cyan-950/40 hover:bg-cyan-600/25 dark:hover:bg-cyan-900/60 border border-cyan-500/40 dark:border-cyan-800/60 rounded-xl transition-all shadow-xs cursor-pointer"
              title="PDF, DOCX, PPTX, TXT, MD yoki CSV yuklash"
            >
              <Upload className="w-4.5 h-4.5 stroke-[2.2]" />
              <span>{t('Hujjat')}</span>
            </button>
          )}

          {/* Quick task button */}
          {currentUser?.permissions.includes('tasks.create') && (
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="hidden md:flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-600/15 dark:bg-emerald-950/40 hover:bg-emerald-600/25 dark:hover:bg-emerald-900/60 border border-emerald-500/40 dark:border-emerald-800/60 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Yangi vazifa yaratish"
            >
              <PlusCircle className="w-4.5 h-4.5 stroke-[2.2]" />
              <span>{t('Vazifa')}</span>
            </button>
          )}

          {/* User Profile Card Dropdown Container */}
          <div ref={userMenuRef} className="relative">
            {/* Hidden file input for changing profile photo */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarFileChange}
            />

            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-1.5 sm:gap-2 p-1 sm:px-2.5 sm:py-1.5 bg-slate-900/90 hover:bg-slate-800/80 border border-slate-700/80 rounded-xl transition-all"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="true"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-xs text-slate-200 uppercase shadow-sm flex-shrink-0 overflow-hidden">
                {currentUser?.avatar ? (
                  <Image src={currentUser.avatar} alt={currentUser.name} width={28} height={28} unoptimized className="w-full h-full object-cover" />
                ) : (
                  currentUser?.name ? currentUser.name.charAt(0) : 'U'
                )}
              </div>
              <div className="text-left hidden xl:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-black dark:text-slate-200 truncate max-w-[130px]">
                    {currentUser?.name || 'Foydalanuvchi'}
                  </span>
                  {getRoleBadge(currentUser?.role)}
                </div>
                <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                  {currentUser?.position}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Official User Profile Modal Popover */}
            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-72 sm:w-80 glass-panel-glow rounded-2xl p-4 z-50 shadow-2xl border border-cyan-900/50 animate-in fade-in duration-150 space-y-3.5"
                onClick={e => e.stopPropagation()}
              >
                {/* Feedback Notification */}
                {feedbackMsg && (
                  <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-[11px] font-semibold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{feedbackMsg}</span>
                  </div>
                )}

                {/* Profile View or Edit Form */}
                {!isEditingProfile ? (
                  <>
                    {/* User Identity Header */}
                    <div className="flex items-start gap-3 pb-3 border-b border-slate-800">
                      <div className="relative group flex-shrink-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-500 flex items-center justify-center font-bold text-lg text-slate-200 shadow-md overflow-hidden">
                          {currentUser?.avatar ? (
                            <Image src={currentUser.avatar} alt={currentUser.name} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                          ) : (
                            currentUser?.name ? currentUser.name.charAt(0) : 'U'
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isSaving}
                          className="absolute -bottom-1 -right-1 p-1 rounded-full bg-cyan-600 hover:bg-cyan-500 text-slate-200 shadow-md border-2 border-slate-900 transition-transform hover:scale-110"
                          title="Profil rasmini o‘zgartirish"
                        >
                          <Camera className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                          {currentUser?.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {currentUser?.position}
                        </p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {getRoleBadge(currentUser?.role)}
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                            ID: LC-{currentUser?.id.replace('user-', '00')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-1.5 text-xs text-slate-300">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/60 text-[11px]">
                        <span className="text-slate-400">Kirish identifikatori:</span>
                        <span className="font-mono text-cyan-400 truncate max-w-[160px]">{currentUser?.email || currentUser?.loginId || currentUser?.id}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-[11px]">
                        <span className="text-slate-400">Tizim holati:</span>
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Sessiya faol
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-2 border-t border-slate-800 space-y-2">
                      {/* Edit Profile Button */}
                      <button
                        onClick={() => setIsEditingProfile(true)}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Profil ma’lumotlarini tahrirlash</span>
                      </button>

                      {currentUser?.permissions.includes('system.settings') && (
                        <button
                          onClick={() => {
                            setIsUserMenuOpen(false);
                            setActiveTab('settings');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition-colors"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Tizim Sozlamalari</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-rose-950/40 hover:bg-rose-950/80 border border-rose-800/50 text-rose-300 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Tizimdan Chiqish (Hisobdan chiqish)</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* Profile Edit Form */
                  <form onSubmit={handleSaveProfile} className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        Profilni Tahrirlash
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Change Avatar Photo in Edit Mode */}
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center font-bold text-lg text-slate-200 overflow-hidden flex-shrink-0">
                        {editAvatar ? (
                          <Image src={editAvatar} alt={editName} width={48} height={48} unoptimized className="w-full h-full object-cover" />
                        ) : (
                          <span>{editName ? editName.charAt(0) : 'U'}</span>
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="text-[11px] font-semibold text-slate-300">Profil rasmi</div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 rounded-lg bg-cyan-900/60 hover:bg-cyan-800 text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                          >
                            <Camera className="w-3 h-3" />
                            <span>Rasm tanlash</span>
                          </button>
                          {editAvatar && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="p-1 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] transition-colors"
                              title="Rasmni o‘chirish"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">Ism, lavozim va aloqa ma’lumotlarini faqat tasdiqlangan HR manbasi yangilaydi.</p>

                    {/* Action buttons */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors text-center"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="flex-1 py-1.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-200 transition-colors flex items-center justify-center gap-1 shadow-md"
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saqlanmoqda...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-3.5 h-3.5" />
                            <span>Saqlash</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
