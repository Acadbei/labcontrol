'use client';

import React, { useEffect } from 'react';
import Image from 'next/image';
import { useApp, NavTab } from '@/context/AppContext';
import { NAVIGATION_PERMISSIONS, hasPermission } from '@/lib/policy';
import {
  LayoutDashboard,
  Sparkles,
  FolderKanban,
  Database,
  FileText,
  CheckSquare,
  Users,
  BarChart3,
  History,
  Settings,
  ChevronRight,
  Shield,
  Layers,
  X,
  Upload,
  PlusCircle,
  Brain
} from 'lucide-react';

interface NavItem {
  id: NavTab;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Boshqaruv Paneli',
    subLabel: 'Asosiy ko‘rsatkichlar & KPI',
    icon: LayoutDashboard
  },
  {
    id: 'chat',
    label: 'LabControl Yordamchi',
    subLabel: 'Sun’iy intellekt & Bilimlar',
    icon: Sparkles,
    badge: 'AI'
  },
  {
    id: 'projects',
    label: 'Loyihalar',
    subLabel: 'Konstruksiyalar & Chizmalar',
    icon: FolderKanban
  },
  {
    id: 'knowledge',
    label: 'Bilimlar Bazasi',
    subLabel: 'Standartlar & Apparatura',
    icon: Database
  },
  {
    id: 'documents',
    label: 'Hujjatlar Tahlili',
    subLabel: 'PDF, DOCX, PPTX, matn va CSV',
    icon: FileText,
    badge: '7 tur'
  },
  {
    id: 'tasks',
    label: 'Vazifalar',
    subLabel: 'Ijro va muddatlar',
    icon: CheckSquare
  },
  {
    id: 'team',
    label: 'Laboratoriya Jamoasi',
    subLabel: 'Ruxsatli jamoa katalogi',
    icon: Users
  },
  {
    id: 'reports',
    label: 'Tahliliy Hisobotlar',
    subLabel: 'Monitoring & Chop etish',
    icon: BarChart3
  },
  {
    id: 'activity',
    label: 'Faollik Jurnali',
    subLabel: 'Xavfsizlik audit qaydlari',
    icon: History
  },
  {
    id: 'settings',
    label: 'Tizim Sozlamalari',
    subLabel: 'AI & Zaxira boshqaruvi',
    icon: Settings
  }
];

export function Sidebar() {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    setIsUploadModalOpen,
    setIsNewTaskModalOpen,
    isDemoMode,
    t
  } = useApp();

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, setIsMobileMenuOpen]);

  // Navigation is driven by the same server-issued capability list as the API.
  const allowedNavItems = NAV_ITEMS.filter(item => {
    if (!currentUser) return false;
    const permission = NAVIGATION_PERMISSIONS[item.id as keyof typeof NAVIGATION_PERMISSIONS];
    return !permission || hasPermission(currentUser, permission);
  });

  const renderNavLinks = () => (
    <nav className="space-y-1.5">
      {allowedNavItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-left transition-all group cursor-pointer ${isActive
              ? 'bg-cyan-500/15 dark:bg-cyan-950/60 border border-cyan-500/50 dark:border-cyan-500/50 shadow-md font-semibold'
              : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent hover:border-slate-300/60 dark:hover:border-slate-800/60'
              }`}
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${isActive
                  ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/35 scale-105 ring-2 ring-cyan-400/40'
                  : 'bg-white/95 dark:bg-slate-900/90 text-cyan-700 dark:text-cyan-400 border border-slate-300/80 dark:border-slate-700/80 group-hover:scale-110 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 group-hover:border-cyan-400/60 shadow-xs'
                  }`}
              >
                <Icon className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div className="truncate">
                <div className="text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span className={`truncate ${isActive ? 'text-gray-950 dark:text-white sidebar-active-label' : 'text-slate-800 dark:text-slate-200'}`}>
                    {t(item.label)}
                  </span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-md font-mono font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/40">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className={`text-[10px] ${isActive ? 'text-slate-900 dark:text-slate-200 font-semibold sidebar-active-sublabel' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200'} truncate`}>
                  {t(item.subLabel)}
                </div>
              </div>
            </div>
            {isActive && <ChevronRight className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />}
          </button>
        );
      })}
    </nav>
  );

  const renderFooterStatus = () => (
    <div className="pt-3 border-t border-slate-300/80 dark:border-slate-800/80 px-1 space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span className="font-semibold">{t('Tizim holati:')}</span>
        </div>
        <span className={`font-mono font-bold text-[11px] ${isDemoMode ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{isDemoMode ? t('DEMO MA’LUMOTI') : t('Sessiya tasdiqlandi')}</span>
      </div>
      <div className="p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-slate-800 text-[11px]">
        <div className="text-slate-900 dark:text-slate-100 font-bold truncate">{currentUser?.name}</div>
        <div className="text-slate-600 dark:text-slate-400 truncate font-medium">{currentUser?.position ? t(currentUser.position) : ''}</div>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar - noticeably darker than main screen */}
      <aside className="hidden lg:flex lg:w-72 bg-[#e2dacf] dark:bg-[#090e1a] border-r border-[#cfc4b3] dark:border-slate-800/90 flex-col justify-between py-4 px-3.5 select-none flex-shrink-0 shadow-sm">
        <div className="space-y-4">
          <div className="px-3.5 py-2.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-300/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-600/15 dark:bg-cyan-950/80 flex items-center justify-center text-cyan-700 dark:text-cyan-400">
                <Layers className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{t('Asosiy Modullar')}</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-700">{allowedNavItems.length} ta</span>
          </div>

          {renderNavLinks()}
        </div>

        {renderFooterStatus()}
      </aside>

      {/* 2. Mobile / Tablet Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer content */}
          <div className="relative w-76 max-w-[85vw] bg-[#e2dacf] dark:bg-[#090e1a] border-r border-[#cfc4b3] dark:border-cyan-900/50 flex flex-col justify-between py-4 px-3.5 z-10 animate-in slide-in-from-left duration-200 shadow-2xl">
            <div className="space-y-4">
              {/* Drawer header */}
              <div className="flex items-center justify-between px-2 pb-3 border-b border-slate-300/80 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-900/80 p-0.5 border border-cyan-500/40 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                    <Image src="/logo.png" alt="LabControl" width={36} height={36} className="w-full h-full object-contain rounded-full" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-wide">LabControl</span>
                    <p className="text-[10px] text-cyan-700 dark:text-cyan-400 font-mono font-semibold">Modullar menyusi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-black/5 dark:hover:bg-slate-800"
                  aria-label="Menyuni yopish"
                >
                  <X className="w-6 h-6 stroke-[2.2]" />
                </button>
              </div>

              {/* Mobile quick actions */}
              <div className="grid grid-cols-2 gap-2.5 px-1">
                {currentUser?.permissions.includes('documents.upload') && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsUploadModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-cyan-600/15 dark:bg-cyan-950/60 border border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-xs font-bold"
                  >
                    <Upload className="w-4.5 h-4.5 stroke-[2.2]" />
                    <span>Hujjat</span>
                  </button>
                )}
                {currentUser?.permissions.includes('tasks.create') && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsNewTaskModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-600/15 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold"
                  >
                    <PlusCircle className="w-4.5 h-4.5 stroke-[2.2]" />
                    <span>Vazifa</span>
                  </button>
                )}
              </div>

              {/* Navigation list */}
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
                {renderNavLinks()}
              </div>
            </div>

            {renderFooterStatus()}
          </div>
        </div>
      )}
    </>
  );
}
