'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Printer,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderGit2,
  ListTodo,
  TrendingUp,
  RefreshCw,
  DollarSign
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatBudget } from '@/lib/i18n';

export function ReportsView() {
  const { dataVersion, triggerDataRefresh, t, scriptMode } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/dashboard/stats', { cache: 'no-store' });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Failed to load stats for reports', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [dataVersion]);

  if (loading && !stats) {
    return (
      <div className="neu-card p-12 text-center space-y-3">
        <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400 font-mono">{t('Tahliliy hisobot yuklanmoqda...')}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="neu-card p-8 text-center space-y-3">
        <p className="text-sm text-rose-400">{t('Hisobot maʼlumotlarini olishda xatolik yuz berdi.')}</p>
        <button
          onClick={fetchStats}
          className="px-4 py-2 liquid-btn-ghost text-xs text-slate-200"
        >
          {t('Qayta urinish')}
        </button>
      </div>
    );
  }

  const taskDist = stats.taskDistribution || {};
  const totalTasks = (taskDist.TODO || 0) + (taskDist.IN_PROGRESS || 0) + (taskDist.REVIEW || 0) + (taskDist.DONE || 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Laboratoriya Tahliliy Hisobotlari')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Ilmiy-ishlab chiqarish natijalari, ijro intizomi va texnik loyihalar real vaqt hisoboti')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerDataRefresh()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-btn-ghost text-slate-300 text-xs font-semibold"
            title={t('Maʼlumotlarni yangilash')}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t('Yangilash')}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>{t('Chop etish / PDF saqlash')}</span>
          </button>
        </div>
      </div>

      {/* Main Report Document - Printable Clean / Screen 3D Neumorphism */}
      <div className="neu-card p-6 sm:p-8 space-y-8">
        <div className="border-b border-slate-800/80 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-200">
                {t('Ishlab Chiqarish Laboratoriyasi Rasmiy Monitoring Hisoboti')}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {t('Tizim: LabControl v2.0 • Yagona maʼlumotlar bazasi (Single Source of Truth)')}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <span className="text-xs font-mono text-cyan-400 block font-semibold">
                {t('Sana:')} {new Date().toLocaleDateString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {t('Vaqt:')} {new Date().toLocaleTimeString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Executive KPI Overview */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. {t('Asosiy Ko‘rsatkichlar (KPI)')}
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">{t('Jami Loyihalar')}</span>
                <FolderGit2 className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono mt-2">
                {stats.kpis.totalProjects} {t('ta')}
              </div>
              <p className="text-[11px] text-emerald-400 mt-1 font-mono">{stats.kpis.activeProjects} {t('faol jarayonda')}</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">{t('Bajarilgan Vazifalar')}</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-2">
                {stats.kpis.doneTasks} {t('ta')}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">
                {stats.kpis.pendingTasks} {t('ta ijro kutilmoqda')} ({totalTasks} {t('jami')})
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">{t('Muddati o‘tgan')}</span>
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              </div>
              <div className="text-2xl font-bold text-rose-400 font-mono mt-2">
                {stats.kpis.overdueTasks} {t('ta')}
              </div>
              <p className="text-[11px] text-rose-400/90 mt-1 font-mono">
                {stats.kpis.overdueTasks > 0 ? t('Qatʼiy nazorat talab etiladi') : t('Muddati o‘tgan vazifa yo‘q')}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-semibold">{t('Taxminiy Mablag‘')}</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono mt-2 truncate">
                {formatBudget(stats.kpis.totalEstimatedBudget, 'UZS') || '0 so\'m'}
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-mono">{t('Loyihalar umumiy budjeti')}</p>
            </div>
          </div>
        </div>

        {/* Section 2: Task Execution Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. {t('Vazifalar Taqsimoti')}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-[11px] text-slate-400 font-medium">{t('Reja')} (TODO)</div>
              <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                {taskDist.TODO || 0} {t('ta')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-[11px] text-cyan-400 font-medium">{t('Jarayonda')} (In Progress)</div>
              <div className="text-xl font-bold text-cyan-400 font-mono mt-1">
                {taskDist.IN_PROGRESS || 0} {t('ta')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-[11px] text-amber-400 font-medium">{t('Ko‘rib chiqish')} (Review)</div>
              <div className="text-xl font-bold text-amber-400 font-mono mt-1">
                {taskDist.REVIEW || 0} {t('ta')}
              </div>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
              <div className="text-[11px] text-emerald-400 font-medium">{t('Bajarildi')} (Done)</div>
              <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                {taskDist.DONE || 0} {t('ta')}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Projects Status Breakdown */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            3. {t('Loyihalar Holati va Texnik Progress Jadvali')}
          </h3>
          <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-900/80 text-slate-400 font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3.5">{t('Kodi')}</th>
                  <th className="p-3.5">{t('Loyiha Nomi')}</th>
                  <th className="p-3.5">{t('Holati')}</th>
                  <th className="p-3.5">{t('Ustuvorlik')}</th>
                  <th className="p-3.5">{t('Taxminiy Mablag‘')}</th>
                  <th className="p-3.5">{t('Ijro Muddati')}</th>
                  <th className="p-3.5 text-right">{t('Progress')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {stats.projects.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-900/50">
                    <td className="p-3.5 font-mono font-bold text-cyan-400">{p.code}</td>
                    <td className="p-3.5 font-semibold text-slate-200">{p.name}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-800 text-slate-300">
                        {t(p.status)}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-amber-400 font-semibold">{t(p.priority)}</span>
                    </td>
                    <td className="p-3.5 font-mono text-amber-400">
                      {p.estimatedBudget !== undefined ? formatBudget(p.estimatedBudget, p.budgetCurrency) : '-'}
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">{p.deadline}</td>
                    <td className="p-3.5 font-mono font-bold text-right text-cyan-400">
                      {p.progressPercent || 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Team Workload Analysis */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            4. {t('Jamoa Muhandislari va Ijro Yuklamasi')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {stats.teamWorkload.map((m: any) => (
              <div
                key={m.userId}
                className="p-3.5 rounded-2xl bg-slate-900/50 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{m.name}</h4>
                  <p className="text-[10px] text-slate-400">{m.position ? t(m.position) : ''}</p>
                </div>
                <div className="text-right text-xs font-mono">
                  <div className="text-slate-300">
                    {t('Biriktirilgan')}: <strong className="text-slate-100">{m.totalTasks}</strong>
                  </div>
                  <div className="text-emerald-400 text-[11px]">{t('Bajarildi')}: {m.completedTasks} {t('ta')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Signature Block for Print */}
        <div className="pt-8 border-t border-slate-800/80 grid grid-cols-2 gap-8 text-xs text-slate-400">
          <div>
            <p className="font-semibold text-slate-300">{t('Laboratoriya Mudiri:')}</p>
            <div className="mt-8 border-b border-dashed border-slate-700 w-48"></div>
            <p className="mt-1 text-[11px]">{t('Imzo va sana')}</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-slate-300">{t('Bosh Texnolog / Masʼul Muhandis:')}</p>
            <div className="mt-8 border-b border-dashed border-slate-700 w-48 ml-auto"></div>
            <p className="mt-1 text-[11px]">{t('Imzo va sana')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
