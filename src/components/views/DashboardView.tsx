'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Database,
  Users,
  Activity,
  ArrowRight,
  TrendingUp,
  Cpu,
  Sparkles,
  Zap,
  DollarSign,
  ShieldCheck
} from 'lucide-react';
import { formatBudget, getActivityStatusInfo } from '@/lib/i18n';

export function DashboardView() {
  const {
    setActiveTab,
    setIsUploadModalOpen,
    setIsNewTaskModalOpen,
    currentUser,
    dataVersion,
    t,
    scriptMode
  } = useApp();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to load stats:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [dataVersion, fetchStats]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono text-slate-400">{t('Laboratoriya ma’lumotlari yuklanmoqda...')}</p>
        </div>
      </div>
    );
  }

  const { kpis, tasksByStatus, projects, teamWorkload, recentActivity } = stats;

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Welcome Banner - Liquid 3D Neumorphism */}
      <div className="neu-card p-5 sm:p-6 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center flex-wrap gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-700/50 shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                LabControl • {t('Ikkinchi Miya')}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {new Date().toLocaleDateString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide">
              <span className="text-slate-400">
                {t('Xush kelibsiz')},{' '}
              </span>
              <span className="text-cyan-400 font-extrabold">{currentUser?.name}</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {t('Ruxsatingiz doirasidagi loyihalar, hujjatlar va vazifalar.')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs"
            >
              <Sparkles className="w-4 h-4" />
              <span>{t('Yordamchi bilan muloqot')}</span>
            </button>
            {currentUser?.permissions?.includes('documents.upload') && (
              <button
                onClick={() => setIsUploadModalOpen(true)}
                className="px-4 py-2.5 rounded-xl liquid-btn-ghost text-slate-200 text-xs font-semibold"
              >
                {t('Hujjat yuklash')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Grid - Volumetric Cards matching Icon Colors */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* 1. Faol Loyihalar - Cyan Theme */}
        <div
          onClick={() => setActiveTab('projects')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-cyan-500/15 via-[#faf7f0] to-cyan-500/5 dark:from-cyan-950/60 dark:via-slate-900/90 dark:to-cyan-900/30 border-2 border-cyan-400/60 dark:border-cyan-500/40 shadow-cyan-500/10 dark:shadow-cyan-950/40 hover:border-cyan-500 hover:shadow-cyan-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-cyan-950 dark:text-cyan-200 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors truncate">
              {t('Faol Loyihalar')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-cyan-500/20 dark:bg-cyan-950/80 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-400/50 shadow-xs group-hover:scale-110 group-hover:bg-cyan-500 group-hover:text-white transition-all flex-shrink-0">
              <FolderKanban className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-cyan-950 dark:text-cyan-100 font-mono my-0.5">{kpis.activeProjects}</div>
            <p className="text-[11px] text-cyan-800/90 dark:text-cyan-300/80 font-semibold mt-1 truncate">
              {t('Jami')} {kpis.totalProjects} {t('ta loyihadan')}
            </p>
          </div>
        </div>

        {/* 2. Kutilayotgan - Amber Theme */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-amber-500/15 via-[#faf7f0] to-amber-500/5 dark:from-amber-950/60 dark:via-slate-900/90 dark:to-amber-900/30 border-2 border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/10 dark:shadow-amber-950/40 hover:border-amber-500 hover:shadow-amber-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors truncate">
              {t('Kutilayotgan')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-400/50 shadow-xs group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all flex-shrink-0">
              <Clock className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100 font-mono my-0.5">{kpis.pendingTasks}</div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 font-semibold mt-1 truncate">{t('Jarayondagi vazifalar')}</p>
          </div>
        </div>

        {/* 3. Muddati o‘tgan - Rose Theme */}
        <div
          onClick={() => setActiveTab('tasks')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-rose-500/15 via-[#faf7f0] to-rose-500/5 dark:from-rose-950/60 dark:via-slate-900/90 dark:to-rose-900/30 border-2 border-rose-400/60 dark:border-rose-500/40 shadow-rose-500/10 dark:shadow-rose-950/40 hover:border-rose-500 hover:shadow-rose-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-rose-950 dark:text-rose-200 group-hover:text-rose-600 dark:group-hover:text-rose-300 transition-colors truncate">
              {t('Muddati o‘tgan')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-rose-500/20 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-400/50 shadow-xs group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all flex-shrink-0">
              <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-950 dark:text-rose-100 font-mono my-0.5">{kpis.overdueTasks}</div>
            <p className="text-[11px] text-rose-800/90 dark:text-rose-300/80 font-semibold mt-1 truncate">{t('Shoshilinch nazorat')}</p>
          </div>
        </div>

        {/* 4. Hujjatlar - Emerald Theme */}
        <div
          onClick={() => setActiveTab('documents')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-emerald-500/15 via-[#faf7f0] to-emerald-500/5 dark:from-emerald-950/60 dark:via-slate-900/90 dark:to-emerald-900/30 border-2 border-emerald-400/60 dark:border-emerald-500/40 shadow-emerald-500/10 dark:shadow-emerald-950/40 hover:border-emerald-500 hover:shadow-emerald-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors truncate">
              {t('Hujjatlar')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-400/50 shadow-xs group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all flex-shrink-0">
              <FileText className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100 font-mono my-0.5">{kpis.totalDocuments}</div>
            <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/80 font-semibold mt-1 truncate">{t('Hujjat yozuvlari')}</p>
          </div>
        </div>

        {/* 5. Bilimlar bazasi - Indigo Theme */}
        <div
          onClick={() => setActiveTab('knowledge')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-indigo-500/15 via-[#faf7f0] to-indigo-500/5 dark:from-indigo-950/60 dark:via-slate-900/90 dark:to-indigo-900/30 border-2 border-indigo-400/60 dark:border-indigo-500/40 shadow-indigo-500/10 dark:shadow-indigo-950/40 hover:border-indigo-500 hover:shadow-indigo-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate">
              {t('Bilimlar bazasi')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-indigo-500/20 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-400/50 shadow-xs group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all flex-shrink-0">
              <Database className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-indigo-950 dark:text-indigo-100 font-mono my-0.5">{kpis.totalKnowledgeItems}</div>
            <p className="text-[11px] text-indigo-800/90 dark:text-indigo-300/80 font-semibold mt-1 truncate">{t('Standart & parametrlar')}</p>
          </div>
        </div>

        {/* 6. Taxminiy Mablag‘ - Golden Amber/Yellow Theme */}
        <div
          onClick={() => setActiveTab('projects')}
          className="rounded-2xl p-4 sm:p-5 cursor-pointer group transition-all duration-300 hover:-translate-y-1 shadow-md bg-gradient-to-br from-amber-500/20 via-[#faf7f0] to-yellow-500/10 dark:from-amber-950/70 dark:via-slate-900/90 dark:to-yellow-900/30 border-2 border-amber-400/60 dark:border-amber-500/40 shadow-amber-500/10 dark:shadow-amber-950/40 hover:border-amber-500 hover:shadow-amber-500/25 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors truncate">
              {t('Taxminiy Mablag‘')}
            </span>
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-amber-500/25 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-400/50 shadow-xs group-hover:scale-110 group-hover:bg-amber-500 group-hover:text-white transition-all flex-shrink-0">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2.2]" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-amber-950 dark:text-amber-200 font-mono my-0.5 truncate">
              {formatBudget(kpis.totalEstimatedBudget, 'UZS') || '0 so\'m'}
            </div>
            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80 font-semibold mt-1 truncate">{t('Barcha loyihalar budjeti')}</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Projects & Tasks Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Active Projects Overview */}
        <div className="lg:col-span-2 neu-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl liquid-btn-primary flex items-center justify-center">
                <FolderKanban className="w-4 h-4 text-slate-100" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-200">{t('Asosiy Laboratoriya Loyihalari')}</h2>
            </div>
            <button
              onClick={() => setActiveTab('projects')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold transition-colors"
            >
              {t('Barchasini ko‘rish')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.map((p: any) => {
              const actInfo = getActivityStatusInfo(p.activityStatus, scriptMode);
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveTab('projects')}
                  className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 transition-all cursor-pointer shadow-sm group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-xs font-mono px-2 py-0.5 rounded-lg bg-slate-950/80 text-cyan-400 font-bold border border-slate-800 flex-shrink-0">
                        {p.code}
                      </span>
                      <span className="text-xs sm:text-sm font-bold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {p.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {p.activityStatus && (
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${actInfo.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${actInfo.dot}`} />
                          <span className={actInfo.color}>{actInfo.labelText}</span>
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${
                          p.priority === 'Critical'
                            ? 'glow-badge-rose'
                            : p.priority === 'High'
                            ? 'glow-badge-amber'
                            : 'glow-badge-cyan'
                        }`}
                      >
                        {p.priority === 'Critical' ? t('O‘ta muhim') : p.priority === 'High' ? t('Yuqori') : p.priority === 'Medium' ? t('O‘rta') : t('Past')}
                      </span>
                      {p.estimatedBudget !== undefined && (
                        <span className="text-[10px] text-amber-400 font-mono font-semibold">
                          💰 {formatBudget(p.estimatedBudget, p.budgetCurrency)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Liquid Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>{t('Bajarilish ko‘rsatkichi')}</span>
                      <span className="font-mono text-cyan-400 font-bold">{p.progressPercent || 0}%</span>
                    </div>
                    <div className="liquid-progress-track h-2">
                      <div
                        className="liquid-progress-fill h-full"
                        style={{ width: `${p.progressPercent || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Task Status Overview */}
        <div className="neu-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl liquid-btn-primary flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-slate-100" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-200">{t('Vazifalar Holati')}</h2>
            </div>
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              {t('Barchasi')}
            </button>
          </div>

          <div className="space-y-2.5">
            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span className="text-xs font-medium text-slate-300">{t('Rejalashtirilgan')} (TODO)</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200 px-2 py-0.5 rounded-lg bg-slate-800">
                {tasksByStatus.TODO}
              </span>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-medium text-slate-300">{t('Jarayonda')} (IN PROGRESS)</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-400 px-2 py-0.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
                {tasksByStatus.IN_PROGRESS}
              </span>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-xs font-medium text-slate-300">{t('Tekshiruvda')} (REVIEW)</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 px-2 py-0.5 rounded-lg bg-indigo-950/40 border border-indigo-800/40">
                {tasksByStatus.REVIEW}
              </span>
            </div>

            <div
              onClick={() => setActiveTab('tasks')}
              className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-medium text-slate-300">{t('Bajarildi')} (DONE)</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 px-2 py-0.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                {tasksByStatus.DONE}
              </span>
            </div>
          </div>

          {currentUser?.permissions.includes('tasks.create') && (
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="w-full py-2.5 rounded-xl border border-dashed border-slate-700/80 hover:border-cyan-500 text-xs font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
            >
              + {t('Yangi vazifa qo‘shish')}
            </button>
          )}
        </div>
      </div>

      {/* Team Workload & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Team Workload */}
        <div className="neu-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl liquid-btn-primary flex items-center justify-center">
                <Users className="w-4 h-4 text-slate-100" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-200">{t('Jamoa Yuklamasi va Vazifalar')}</h2>
            </div>
            <button
              onClick={() => setActiveTab('team')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              {t('Jamoa profillari')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {teamWorkload.slice(0, 5).map((member: any) => (
              <div
                key={member.userId}
                onClick={() => setActiveTab('team')}
                className="p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 flex items-center justify-between gap-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-900/60 to-indigo-900/60 border border-purple-700/40 flex items-center justify-center font-bold text-xs text-purple-200 flex-shrink-0">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">{member.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{member.position ? t(member.position) : ''}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                    {t('Faol')}: <strong className="text-amber-400">{member.activeTasks}</strong>
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                    {t('Bitgan')}: <strong className="text-emerald-400">{member.completedTasks}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Stream */}
        <div className="neu-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl liquid-btn-primary flex items-center justify-center">
                <Activity className="w-4 h-4 text-slate-100" />
              </div>
              <h2 className="text-xs sm:text-sm font-bold text-slate-200">{t('Oxirgi Audit va Xavfsizlik Faolligi')}</h2>
            </div>
            <button
              onClick={() => setActiveTab('activity')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
            >
              {t('Audit jurnali')} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
            {recentActivity.map((log: any) => (
              <div
                key={log.id}
                onClick={() => setActiveTab('activity')}
                className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 text-xs space-y-1 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300 text-[11px] truncate mr-2">{t(log.action)}</span>
                  <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-slate-300 text-[11px] font-medium truncate">{log.object}</div>
                <p className="text-[10px] text-slate-400 leading-relaxed truncate">{t(log.details)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
