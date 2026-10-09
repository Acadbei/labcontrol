'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Search,
  X,
  FolderKanban,
  FileText,
  CheckSquare,
  Database,
  ArrowRight,
  Sparkles,
  Command
} from 'lucide-react';

export function GlobalSearchModal() {
  const {
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    setActiveTab,
    setSelectedDetailItem
  } = useApp();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      } else if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen, setIsGlobalSearchOpen]);

  // Focus input on open
  useEffect(() => {
    if (isGlobalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isGlobalSearchOpen]);

  // Live search query
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  // Handle keyboard navigation inside search list
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        selectResult(results[selectedIndex]);
      }
    }
  };

  const selectResult = (item: any) => {
    setSelectedDetailItem({ type: item.entityType, id: item.id });
    setActiveTab(item.targetTab);
    setIsGlobalSearchOpen(false);
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'project':
        return <FolderKanban className="w-4 h-4 text-cyan-400" />;
      case 'document':
        return <FileText className="w-4 h-4 text-amber-400" />;
      case 'task':
        return <CheckSquare className="w-4 h-4 text-rose-400" />;
      case 'knowledge':
        return <Database className="w-4 h-4 text-emerald-400" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  const getItemBadgeClass = (type: string) => {
    switch (type) {
      case 'project':
        return 'glow-badge-cyan';
      case 'document':
        return 'glow-badge-amber';
      case 'task':
        return 'glow-badge-rose';
      case 'knowledge':
        return 'glow-badge-emerald';
      default:
        return 'bg-slate-800 text-slate-300';
    }
  };

  if (!isGlobalSearchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="glass-panel-glow w-full max-w-2xl rounded-2xl border border-cyan-800/60 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Box */}
        <div className="p-4 border-b border-slate-800/80 flex items-center gap-3 bg-slate-900/60">
          <Search className="w-5 h-5 text-cyan-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Loyiha, hujjat, vazifa yoki bilimni qidiring..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-sans"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-400 hover:text-slate-200 text-xs px-1.5 py-0.5 rounded bg-slate-800"
            >
              Tozalash
            </button>
          )}
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Yopish (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Suggested Quick Searches when input is short */}
        {!query && (
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Tavsiya etilgan qidiruvlar:</span>
              <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                <Command className="w-3 h-3" /> + K ochish uchun
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-slate-500">Natijalar siz ko‘ra oladigan yozuvlardan olinadi.</span>
            </div>
          </div>
        )}

        {/* Results List */}
        {query && (
          <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Laboratoriya xotirasidan qidirilmoqda...
              </div>
            ) : results.length > 0 ? (
              results.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={`${item.entityType}-${item.id}`}
                    onClick={() => selectResult(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`p-3 rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/60 border border-cyan-800/60 shadow-sm'
                        : 'hover:bg-slate-900/50 border border-transparent'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-slate-800/80 mt-0.5 flex-shrink-0">
                      {getItemIcon(item.entityType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${getItemBadgeClass(item.entityType)}`}>
                          {item.typeLabel}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 truncate">
                          {item.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 leading-relaxed">
                        {item.subtitle}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                        <span>{item.meta}</span>
                        <span className="text-cyan-400 flex items-center gap-1">
                          Ochish <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <p className="text-sm font-semibold text-slate-300">
                  &quot;{query}&quot; bo‘yicha hech qanday natija topilmadi
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Qidiruv so‘zini o‘zgartirib ko‘ring yoki boshqa loyiha/datchik parametrlarini kiriting.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center gap-2">
            <span>↑↓ Harakatlanish</span>
            <span>↵ Tanlash</span>
            <span>ESC Yopish</span>
          </div>
          {results.length > 0 && (
            <span>{results.length} ta natija topildi</span>
          )}
        </div>
      </div>
    </div>
  );
}
