'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Database,
  Search,
  Plus,
  BookOpen,
  Tag,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  Edit,
  Trash2
} from 'lucide-react';
import { KnowledgeItem } from '@/types';

export function KnowledgeView() {
  const {
    currentUser,
    setActiveTab,
    dataVersion,
    triggerDataRefresh,
    selectedDetailItem,
    t,
    scriptMode
  } = useApp();

  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [formError, setFormError] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Standard' | 'Specification' | 'Hardware' | 'Software' | 'CAD/3D' | 'Research'>('Hardware');
  const [content, setContent] = useState('');

  const fetchKnowledge = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/knowledge?q=${encodeURIComponent(search)}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (e) {
      console.error('Fetch knowledge error:', e);
    }
  }, [search]);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge, dataVersion]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch('/api/knowledge', {
        method: editingItem ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(editingItem ? { id: editingItem.id } : {}),
          title: title.trim(),
          category,
          content: content.trim(),
          tags: [category, 'Standart']
        })
      });
      if (res.ok) {
        setIsAddOpen(false);
        setEditingItem(null);
        setTitle('');
        setContent('');
        setFormError('');
        fetchKnowledge();
        triggerDataRefresh();
      } else {
        const result = await res.json().catch(() => ({}));
        setFormError(result.error || t('Bilim yozuvini saqlab bo‘lmadi'));
      }
    } catch (e) {
      console.error('Add knowledge error:', e);
      setFormError(t('Tarmoq xatosi sabab bilim yozuvini saqlab bo‘lmadi'));
    }
  };

  const openEdit = (item: KnowledgeItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setContent(item.content);
    setFormError('');
    setIsAddOpen(true);
  };

  const handleDelete = async (item: KnowledgeItem) => {
    if (!window.confirm(`${t('Haqiqatan ham')} «${item.title}» ${t('bilim yozuvini o‘chirmoqchimisiz?')}`)) return;
    try {
      const res = await fetch(`/api/knowledge?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      if (res.ok) {
        fetchKnowledge();
        triggerDataRefresh();
      } else {
        const result = await res.json().catch(() => ({}));
        window.alert(result.error || t('Bilim yozuvini o‘chirib bo‘lmadi'));
      }
    } catch (e) {
      console.error('Delete knowledge error:', e);
      window.alert(t('Tarmoq xatosi sabab bilim yozuvini o‘chirib bo‘lmadi'));
    }
  };

  const filteredItems = items.filter(i => {
    if (categoryFilter === 'ALL') return true;
    return i.category === categoryFilter;
  });

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'Hardware': return t('Apparatura (Hardware)');
      case 'Software': return t('Dasturiy Ta’minot');
      case 'CAD/3D': return t('CAD & 3D Konstruksiya');
      case 'Standard': return t('Standart & Me’yor');
      case 'Specification': return t('Spetsifikatsiya');
      case 'Research': return t('Ilmiy Tadqiqot');
      default: return cat;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Banner - Liquid 3D Neumorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 neu-card p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <Database className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Laboratoriya Bilimlar Bazasi')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Muhandislik standartlari, mikrokontroller protokollari, datchik spetsifikatsiyalari va ilmiy xulosalar')}
              </p>
            </div>
          </div>
        </div>

        {currentUser?.permissions.includes('knowledge.create') && (
          <button
            onClick={() => {
              setEditingItem(null);
              setTitle('');
              setContent('');
              setFormError('');
              setIsAddOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>{t('Bilim Qo‘shish')}</span>
          </button>
        )}
      </div>

      {/* Search and Category Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('Bilimlar bazasidan qidirish...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs liquid-input placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: t('Barchasi') },
            { id: 'Hardware', label: t('Apparatura') },
            { id: 'Software', label: t('Dastur') },
            { id: 'CAD/3D', label: t('CAD & 3D') },
            { id: 'Standard', label: t('Standartlar') }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setCategoryFilter(c.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                categoryFilter === c.id
                  ? 'liquid-btn-primary text-slate-100'
                  : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Add Knowledge Modal / Drawer */}
      {isAddOpen && (
        <form onSubmit={handleAdd} className="neu-card p-5 sm:p-6 space-y-4 animate-modal-in border border-cyan-500/40">
          <h3 className="text-sm font-bold text-slate-200">
            {editingItem ? t('Bilim yozuvini tahrirlash') : t('Yangi Muhandislik Bilimini Kiritish')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder={t('Bilim mavzusi yoki texnik standart...')}
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="px-3 py-2.5 text-xs liquid-input focus:outline-none"
              required
            />
            <select
              value={category}
              onChange={e => setCategory(e.target.value as any)}
              className="px-3 py-2.5 text-xs liquid-input focus:outline-none"
            >
              <option value="Hardware">Hardware / {t('Apparatura')}</option>
              <option value="Software">Software / {t('Dasturiy ta’minot')}</option>
              <option value="CAD/3D">CAD & 3D {t('Dizayn')}</option>
              <option value="Standard">{t('Standart & Spetsifikatsiya')}</option>
              <option value="Research">{t('Ilmiy Tadqiqot')}</option>
            </select>
          </div>
          <textarea
            placeholder={t('Texnik tavsif, formulalar, cheklovlar yoki qoidalar...')}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2.5 text-xs liquid-input focus:outline-none resize-none"
            required
          />
          {formError && <p role="alert" className="text-xs text-rose-400 font-semibold">{formError}</p>}
          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsAddOpen(false);
                setEditingItem(null);
                setFormError('');
              }}
              className="px-4 py-2 text-xs liquid-btn-ghost text-slate-400 hover:text-slate-200"
            >
              {t('Bekor qilish')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs liquid-btn-primary text-slate-100 font-semibold"
            >
              {editingItem ? t('O‘zgarishlarni saqlash') : t('Saqlash va Indekslash')}
            </button>
          </div>
        </form>
      )}

      {/* Knowledge Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isHighlighted = selectedDetailItem?.type === 'knowledge' && selectedDetailItem.id === item.id;
          return (
            <div
              key={item.id}
              className={`p-5 rounded-2xl transition-all duration-250 space-y-3 ${
                isHighlighted ? 'neu-card-active' : 'neu-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/50">
                  {getCategoryLabel(item.category)}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(item.updatedAt).toLocaleDateString(scriptMode === 'cyrillic' ? 'ru-RU' : 'uz-UZ')}
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-200 leading-snug">{item.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">{item.content}</p>

              {item.technicalParams && item.technicalParams.length > 0 && (
                <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1.5">
                  {item.technicalParams.map((tp, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="text-slate-400 truncate mr-2">{tp.key}:</span>
                      <span className="font-mono text-cyan-300 font-bold flex-shrink-0">{tp.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-[10px] text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-lg border border-slate-700/50">
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {currentUser?.permissions.includes('knowledge.edit') && (
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      aria-label={`${item.title} ${t('bilim yozuvini tahrirlash')}`}
                      title={t('Tahrirlash')}
                      className="text-slate-400 hover:text-cyan-300 p-1 rounded-lg transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {currentUser?.permissions.includes('knowledge.delete') && (
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      aria-label={`${item.title} ${t('bilim yozuvini o‘chirish')}`}
                      title={t('O‘chirish')}
                      className="text-slate-400 hover:text-rose-400 p-1 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('chat')}
                    className="text-cyan-400 hover:text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" /> {t('Yordamchida')}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="col-span-full neu-card p-10 text-center text-xs text-slate-400">
            {t('Bilimlar topilmadi')}
          </div>
        )}
      </div>
    </div>
  );
}
