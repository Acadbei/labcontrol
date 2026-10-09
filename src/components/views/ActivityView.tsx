'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Shield,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  Clock,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { AuditLog } from '@/types';
import { useApp } from '@/context/AppContext';

export function ActivityView() {
  const { dataVersion, triggerDataRefresh, t, scriptMode } = useApp();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/audit', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Failed to load audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [dataVersion]);

  const filteredLogs = logs.filter(l => {
    const matchesSearch =
      l.userName.toLowerCase().includes(search.toLowerCase()) ||
      l.object.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.action.toLowerCase().includes(search.toLowerCase());

    const matchesAction = filterAction === 'ALL' || l.action.toUpperCase().includes(filterAction);
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Banner - Liquid 3D Neumorphism */}
      <div className="neu-card p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <History className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Xavfsizlik & Faollik Jurnali')} (Audit Log)
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Tizimdagi har bir foydalanuvchi harakati, hujjat yuklash, AI so‘rovlari va o‘zgarishlarning qat’iy server qaydi')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => triggerDataRefresh()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-btn-ghost text-slate-300 font-semibold text-xs transition-all"
            title={t('Yangilash')}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('Yangilash')}</span>
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs font-mono font-bold text-cyan-400">
            {t('Jami')}: {logs.length} {t('ta yozuv')}
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('Xodim, amal yoki obyekt bo‘yicha qidiruv...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs liquid-input placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'HUJJAT', 'VAZIFA', 'AI', 'LOYIHA', 'SOZLAMALAR'].map(act => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                filterAction === act
                  ? 'liquid-btn-primary text-slate-100'
                  : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
              }`}
            >
              {act === 'ALL' ? t('Barcha Amallar') : t(act)}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Log Table in Neu Card */}
      <div className="neu-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-900/90 text-slate-400 font-mono border-b border-slate-800">
              <tr>
                <th className="p-3.5">{t('Vaqt')}</th>
                <th className="p-3.5">{t('Foydalanuvchi')}</th>
                <th className="p-3.5">{t('Amal Turi')}</th>
                <th className="p-3.5">{t('Obyekt')}</th>
                <th className="p-3.5">{t('Tafsilotlar')}</th>
                <th className="p-3.5">{t('IP Manzil')}</th>
                <th className="p-3.5">{t('Holat')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {t('Mos keluvchi audit yozuvlari topilmadi.')}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="p-3.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200 whitespace-nowrap">
                      {log.userName}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 whitespace-nowrap">
                        {t(log.action)}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-200">{log.object}</td>
                    <td className="p-3.5 text-slate-400 text-[11px] max-w-xs truncate" title={log.details}>
                      {t(log.details)}
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">{log.ip}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold glow-badge-emerald">
                        {t(log.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
