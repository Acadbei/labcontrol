'use client';

import React, { useState } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  FolderKanban, X, Plus, AlertCircle, Trash2,
  ChevronDown, DollarSign, Cpu, Activity, TrendingUp
} from 'lucide-react';
import { Priority, ProjectActivityStatus } from '@/types';
import { getActivityStatusInfo, formatBudget } from '@/lib/i18n';

interface TechParam { key: string; value: string; unit?: string; }

export function NewProjectModal() {
  const {
    isNewProjectModalOpen, setIsNewProjectModalOpen,
    setActiveTab, triggerDataRefresh, currentUser, t, scriptMode
  } = useAppContext();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('High');
  const [startDate, setStartDate] = useState('');
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<ProjectActivityStatus>('active');
  const [progressPercent, setProgressPercent] = useState(0);
  const [estimatedBudget, setEstimatedBudget] = useState('');
  const [budgetCurrency, setBudgetCurrency] = useState('UZS');
  const [params, setParams] = useState<TechParam[]>([]);
  const [paramKey, setParamKey] = useState('');
  const [paramVal, setParamVal] = useState('');
  const [paramUnit, setParamUnit] = useState('');
  const [showTechParams, setShowTechParams] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isNewProjectModalOpen || !currentUser?.permissions.includes('projects.create')) return null;

  const handleAddParam = () => {
    if (paramKey.trim() && paramVal.trim()) {
      setParams(prev => [...prev, { key: paramKey.trim(), value: paramVal.trim(), unit: paramUnit.trim() }]);
      setParamKey(''); setParamVal(''); setParamUnit('');
    }
  };

  const handleRemoveParam = (idx: number) => {
    setParams(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const budget = estimatedBudget ? parseFloat(estimatedBudget.replace(/\s/g, '')) : undefined;
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          description: description.trim(),
          priority,
          startDate: startDate || undefined,
          deadline: deadline || undefined,
          status: status === 'active' ? 'Active' : status === 'completed' ? 'Completed' : 'Planning',
          activityStatus: status,
          progressPercent: Math.round(progressPercent),
          estimatedBudget: budget,
          budgetCurrency,
          technicalParameters: params
        })
      });
      if (res.ok) {
        triggerDataRefresh();
        setIsNewProjectModalOpen(false);
        // Reset form
        setName(''); setCode(''); setDescription(''); setPriority('High');
        setStartDate(''); setDeadline(''); setStatus('active');
        setProgressPercent(0); setEstimatedBudget('');
        setParams([]); setShowTechParams(false);
        setActiveTab('projects');
      } else {
        const err = await res.json();
        setError(err.error || "Loyihani yaratishda xatolik yuz berdi");
      }
    } catch (e: any) {
      setError(e?.message || "Server bilan bog'lanishda xatolik");
    } finally {
      setIsSubmitting(false);
    }
  };

  const activityInfo = getActivityStatusInfo(status, scriptMode);
  const formattedBudget = estimatedBudget ? formatBudget(parseFloat(estimatedBudget.replace(/\s/g, '')), budgetCurrency) : '';

  const inputCls = "w-full px-3 py-2.5 text-xs liquid-input placeholder-slate-500 focus:outline-none";
  const labelCls = "block text-[11px] font-semibold text-slate-400 mb-1.5 tracking-wide uppercase";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-modal-backdrop">
      <div className="liquid-modal w-full max-w-2xl animate-modal-in space-y-0 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-200">{t('Yangi Laboratoriya Loyihasi')}</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('Loyihaga qo\'shing yoki tahrirlang')}</p>
            </div>
          </div>
          <button
            onClick={() => setIsNewProjectModalOpen(false)}
            className="w-8 h-8 rounded-xl liquid-btn-ghost flex items-center justify-center text-slate-400 hover:text-slate-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 sm:p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2 animate-fade-in-up">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="new-project-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Row 1: Code + Name */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelCls}>{t('Kodi *')}</label>
                <input
                  type="text"
                  required
                  placeholder="LAB-04"
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  className={inputCls + " font-mono font-bold"}
                />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t('Loyiha Nomi *')}</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Optik Lazer Datchik Bloki"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>{t('Loyiha Maqsadi & Tavsifi')}</label>
              <textarea
                rows={3}
                placeholder="Qurilma yoki mahsulotning laboratoriya doirasidagi maqsadi..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className={inputCls + " resize-none"}
              />
            </div>

            {/* Row 2: Priority + Activity Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('Ustuvorlik')}</label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as Priority)}
                  className={inputCls}
                >
                  <option value="Critical">{t("O'ta muhim")} (Critical)</option>
                  <option value="High">{t('Yuqori')} (High)</option>
                  <option value="Medium">{t("O'rta")} (Medium)</option>
                  <option value="Low">{t('Past')} (Low)</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t('Aktivlik holati')}</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value as ProjectActivityStatus)}
                  className={inputCls}
                >
                  <option value="active">{scriptMode === 'latin' ? 'Faol' : 'Фаол'}</option>
                  <option value="inactive">{scriptMode === 'latin' ? 'Faol emas' : 'Фаол эмас'}</option>
                  <option value="pending">{scriptMode === 'latin' ? 'Kutilmoqda' : 'Кутилмоқда'}</option>
                  <option value="completed">{scriptMode === 'latin' ? 'Yakunlandi' : 'Якунланди'}</option>
                  <option value="suspended">{scriptMode === 'latin' ? 'Muzlatilgan' : 'Музлатилган'}</option>
                </select>
              </div>
            </div>

            {/* Row 3: Start + End dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t('Boshlanish Sanasi')}</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>{t('Tugash Sanasi')}</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={e => setDeadline(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + " mb-0"}>
                  <TrendingUp className="w-3.5 h-3.5 inline mr-1 text-cyan-400" />
                  {t("Boshlang'ich Progress (%)")}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-400">{progressPercent}%</span>
                </div>
              </div>
              {/* Liquid Progress Display */}
              <div className="liquid-progress-track h-3 mb-3">
                <div
                  className="liquid-progress-fill h-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progressPercent}
                onChange={e => setProgressPercent(Number(e.target.value))}
                className="liquid-slider w-full"
              />
              {/* Quick presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {[0, 25, 50, 75, 100].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setProgressPercent(v)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      progressPercent === v
                        ? 'bg-cyan-600 text-slate-100 shadow-sm'
                        : 'liquid-btn-ghost text-slate-400 hover:text-cyan-400'
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            {/* ===== BIRLAMCHI TEXNIK PARAMETRLAR (IXTIYORIY) ===== */}
            <div className="rounded-2xl border border-slate-800/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTechParams(!showTechParams)}
                className="w-full flex items-center justify-between p-4 neu-section-header text-left transition-all hover:opacity-90"
              >
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="text-xs font-bold text-slate-200">{t('Birlamchi Texnik Parametrlar (Ixtiyoriy)')}</span>
                    {params.length > 0 && (
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 font-mono">
                        {params.length} ta
                      </span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showTechParams ? 'rotate-180' : ''}`} />
              </button>

              {showTechParams && (
                <div className="p-4 space-y-3 animate-fade-in-up">
                  {/* Budget inside tech section */}
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 space-y-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-slate-300">{t("Taxminiy Mablag' (ixtiyoriy)")}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <input
                          type="number"
                          placeholder="30000000"
                          value={estimatedBudget}
                          onChange={e => setEstimatedBudget(e.target.value)}
                          className={inputCls}
                          min={0}
                        />
                      </div>
                      <div>
                        <select
                          value={budgetCurrency}
                          onChange={e => setBudgetCurrency(e.target.value)}
                          className={inputCls}
                        >
                          <option value="UZS">UZS</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                    </div>
                    {formattedBudget && (
                      <div className="text-[11px] text-amber-400 font-semibold">
                        ≈ {formattedBudget}
                      </div>
                    )}
                  </div>

                  {/* Existing params list */}
                  {params.length > 0 && (
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {params.map((p, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-[11px] animate-fade-in-up"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-slate-300 font-semibold truncate">{p.key}</span>
                            <span className="text-slate-500">:</span>
                            <span className="text-cyan-300 font-mono font-bold truncate">{p.value} {p.unit}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveParam(idx)}
                            className="p-1 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors flex-shrink-0 ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new param row */}
                  <div className="grid grid-cols-7 gap-1.5 items-end">
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('Parametr nomi')}</label>
                      <input
                        type="text"
                        placeholder="Masalan: Quvvat"
                        value={paramKey}
                        onChange={e => setParamKey(e.target.value)}
                        className={inputCls}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParam())}
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="text-[10px] text-slate-500 mb-1 block">{t('Qiymat')}</label>
                      <input
                        type="text"
                        placeholder="500"
                        value={paramVal}
                        onChange={e => setParamVal(e.target.value)}
                        className={inputCls}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParam())}
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={handleAddParam}
                        disabled={!paramKey.trim() || !paramVal.trim()}
                        className="w-full h-[38px] rounded-xl liquid-btn-primary flex items-center justify-center text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-t border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold ${activityInfo.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${activityInfo.dot}`} />
              <span className={activityInfo.color}>{activityInfo.labelText}</span>
            </span>
            {progressPercent > 0 && (
              <span className="text-[10px] font-mono text-cyan-400 font-bold">{progressPercent}%</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold liquid-btn-ghost text-slate-300"
            >
              {t('Bekor qilish')}
            </button>
            <button
              type="submit"
              form="new-project-form"
              disabled={isSubmitting || !name.trim() || !code.trim()}
              className="px-5 py-2 text-xs font-bold liquid-btn-primary text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" />
                  <span>{t('Saqlanmoqda...')}</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t("Loyihani Yaratish")}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
