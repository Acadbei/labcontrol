'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  Upload,
  Search,
  CheckCircle2,
  Cpu,
  Trash2,
  Eye,
  Sparkles,
  Layers,
  FileCode,
  FileSpreadsheet,
  Presentation,
  Filter,
  FileCheck,
  Download,
  X,
  Printer,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { DocumentEntity, DocumentChunk } from '@/types';

export function DocumentsView() {
  const {
    currentUser,
    setIsUploadModalOpen,
    setActiveTab,
    dataVersion,
    triggerDataRefresh,
    selectedDetailItem,
    t
  } = useApp();

  const [documents, setDocuments] = useState<DocumentEntity[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentEntity | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<DocumentEntity | null>(null);
  const [previewChunks, setPreviewChunks] = useState<DocumentChunk[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<'content' | 'params' | 'chunks'>('content');

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error('Fetch docs error:', e);
    }
  }, []);

  const handleOpenDoc = useCallback(async (doc: DocumentEntity) => {
    setSelectedDoc(doc);
    setLoadingDocId(doc.id);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setDocChunks(data.chunks || []);
      }
    } catch (e) {
      console.error('Doc detail error:', e);
    } finally {
      setLoadingDocId(null);
    }
  }, []);

  useEffect(() => {
    void fetchDocuments();
  }, [dataVersion, fetchDocuments]);

  // Handle auto-selection when navigated from global search.
  useEffect(() => {
    if (selectedDetailItem?.type === 'document' && documents.length > 0) {
      const target = documents.find(d => d.id === selectedDetailItem.id);
      if (target) void handleOpenDoc(target);
    }
  }, [selectedDetailItem, documents, handleOpenDoc]);

  const handleOpenPreview = async (doc: DocumentEntity, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPreviewDoc(doc);
    setIsPreviewOpen(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setPreviewChunks(data.chunks || []);
      }
    } catch (e) {
      console.error('Preview error:', e);
    }
  };

  const handleDelete = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(t('Ushbu hujjatni va uning barcha RAG fikrlarini o‘chirishni tasdiqlaysizmi?'))) {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedDoc?.id === docId) setSelectedDoc(null);
        fetchDocuments();
        triggerDataRefresh();
      }
    }
  };

  const handleSetVerification = async (document: DocumentEntity) => {
    const verified = !document.verified;
    try {
      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedDoc(updated);
        fetchDocuments();
        triggerDataRefresh();
      }
    } catch (e) {
      console.error('Verification error:', e);
    }
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText className="w-5 h-5 text-rose-400" />;
      case 'DOCX':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'PPTX':
        return <Presentation className="w-5 h-5 text-amber-400" />;
      case 'TXT':
      case 'MD':
        return <FileCode className="w-5 h-5 text-slate-300" />;
      case 'CSV':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.originalName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'ALL' || doc.fileType === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Banner - Liquid 3D Neumorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 neu-card p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <FileText className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Hujjatlar Tahlili')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('PDF, Word, Taqdimot, TXT, MD va CSV hujjatlarini chuqur RAG indekslash va qidiruv tizimi')}
              </p>
            </div>
          </div>
        </div>

        {currentUser?.permissions.includes('documents.upload') && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs shadow-md transition-all self-start sm:self-auto"
          >
            <Upload className="w-4 h-4" />
            <span>{t('Yangi Hujjat Yuklash')}</span>
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('Hujjat nomi yoki kalit so‘z...')}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs liquid-input placeholder-slate-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: t('Barchasi') },
            { id: 'PDF', label: 'PDF' },
            { id: 'DOCX', label: 'Word (DOCX)' },
            { id: 'PPTX', label: t('Taqdimot') + ' (PPTX)' },
            { id: 'TXT', label: 'TXT / MD' },
            { id: 'CSV', label: 'CSV' }
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setTypeFilter(item.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
                typeFilter === item.id
                  ? 'liquid-btn-primary text-slate-100'
                  : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Document Grid and Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Document Cards List */}
        <div className="lg:col-span-1 space-y-3">
          {filteredDocs.map(doc => {
            const isSelected = selectedDoc?.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => handleOpenDoc(doc)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-250 ${
                  isSelected ? 'neu-card-active' : 'neu-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-lg bg-slate-950/80 text-slate-300 font-bold border border-slate-800">
                        {doc.fileType}
                      </span>
                      <span className={`text-[10px] font-mono flex items-center gap-1 ${doc.isIndexed ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {doc.isIndexed ? <><CheckCircle2 className="w-3 h-3" /> {t('Matn ajratilgan')}</> : t('Matn ajratilmadi')}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-slate-200 truncate">{doc.title}</h3>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{doc.originalName}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 pt-2 border-t border-slate-800/80">
                      <span>{doc.chunksCount} {t('parcha')} · {doc.verified ? t('tasdiqlangan') : t('tekshirilmagan')}</span>
                      <span>{(doc.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>

                    {/* Quick action buttons on card */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/60 justify-end">
                      <button
                        type="button"
                        onClick={e => handleOpenPreview(doc, e)}
                        className="px-2.5 py-1 rounded-lg liquid-btn-ghost text-cyan-300 text-[10px] font-semibold flex items-center gap-1"
                        title={t('Hujjatni ko‘rish')}
                      >
                        <Eye className="w-3 h-3" />
                        <span>{t('Ko‘rish')}</span>
                      </button>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        download={doc.originalName}
                        onClick={e => e.stopPropagation()}
                        className="px-2.5 py-1 rounded-lg liquid-btn-ghost text-emerald-300 text-[10px] font-semibold flex items-center gap-1"
                        title={t('Faylni yuklab olish')}
                      >
                        <Download className="w-3 h-3" />
                        <span>{t('Yuklab olish')}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="neu-card p-8 text-center text-xs text-slate-500">
              {t('Hujjat topilmadi')}
            </div>
          )}
        </div>

        {/* Selected Document Full Intelligence Panel */}
        {selectedDoc ? (
          <div className="lg:col-span-2 neu-card p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-mono uppercase px-2 py-0.5 rounded-lg bg-slate-950/80 text-amber-400 font-bold border border-slate-800">
                    {selectedDoc.fileType} v{selectedDoc.version}
                  </span>
                  <span className="text-xs text-slate-400">{selectedDoc.projectName || t('Umumiy')}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-lg border ${selectedDoc.verified ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' : 'bg-amber-950/60 text-amber-300 border-amber-800/40'}`}>
                    {selectedDoc.verified ? t('Manba tasdiqlangan') : t('Manba tekshirilmagan')}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-200">{selectedDoc.title}</h2>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{selectedDoc.originalName}</p>
              </div>

              {/* Action Buttons: Preview, Download, AI Ask, Delete */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleOpenPreview(selectedDoc)}
                  className="px-3.5 py-1.5 rounded-xl liquid-btn-ghost text-purple-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{t('Ko‘rish')}</span>
                </button>

                <a
                  href={`/api/documents/${selectedDoc.id}/download`}
                  download={selectedDoc.originalName}
                  className="px-3.5 py-1.5 rounded-xl liquid-btn-ghost text-emerald-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t('Yuklab Olish')}</span>
                </a>

                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-3.5 py-1.5 rounded-xl liquid-btn-primary text-slate-100 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('Yordamchidan so‘rash')}</span>
                </button>

                {currentUser?.permissions.includes('documents.delete') && (
                  <button
                    onClick={e => handleDelete(selectedDoc.id, e)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                    title={t('O‘chirish')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                {currentUser?.permissions.includes('documents.verify') && (
                  <button
                    type="button"
                    onClick={() => handleSetVerification(selectedDoc)}
                    className="px-3 py-1.5 rounded-xl liquid-btn-ghost text-amber-300 text-xs font-semibold"
                  >
                    {selectedDoc.verified ? t('Tasdiqni bekor qilish') : t('Manbani tasdiqlash')}
                  </button>
                )}
              </div>
            </div>

            {/* AI Summary Box */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('Ajratilgan matn bo‘yicha qisqa xulosa:')}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedDoc.summary}</p>
            </div>

            {/* Extracted Technical Parameters */}
            {selectedDoc.technicalParameters && selectedDoc.technicalParameters.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  {t('Hujjatdan Ajratib Olingan Texnik Parametrlar:')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedDoc.technicalParameters.map((p, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <span className="text-slate-400 truncate mr-2">{p.key}</span>
                      <span className="font-mono font-bold text-cyan-300 flex-shrink-0">{p.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chunks Preview for RAG */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  {t('Matn parchalari')} ({docChunks.length}):
                </h3>
                <span className="text-[10px] text-slate-500">
                  {selectedDoc.wordCount} {t('so‘z tahlil qilindi')}
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {docChunks.map((chunk, idx) => (
                  <div
                    key={chunk.id || idx}
                    className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-cyan-400 font-mono">
                      <span>{t('Fikr')} #{idx + 1}</span>
                      <span>{t('Sahifa/Slayd')}: {chunk.pageOrSlide ?? t('ko‘rsatilmagan')}</span>
                    </div>
                    <p className="text-slate-300 text-xs leading-relaxed">{chunk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 neu-card p-12 text-center text-slate-500">
            {t('Tahlil qilish uchun hujjatni tanlang')}
          </div>
        )}
      </div>

      {/* FULL DOCUMENT PREVIEW MODAL */}
      {isPreviewOpen && previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 liquid-modal-backdrop">
          <div className="liquid-modal w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-modal-in">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between gap-3 bg-slate-900/60 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 rounded-xl bg-slate-800/80 flex-shrink-0">
                  {getFileIcon(previewDoc.fileType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-lg bg-slate-800 text-amber-400 font-bold">
                      {previewDoc.fileType}
                    </span>
                    <span className="text-xs text-slate-400 truncate">{previewDoc.projectName || t('Laboratoriya')}</span>
                  </div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-200 truncate">{previewDoc.title}</h2>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{previewDoc.originalName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`/api/documents/${previewDoc.id}/download`}
                  download={previewDoc.originalName}
                  className="px-3 py-1.5 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('Yuklab Olish')}</span>
                </a>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl liquid-btn-ghost text-slate-300"
                  title={t('Chop etish')}
                >
                  <Printer className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="p-2 rounded-xl liquid-btn-ghost text-slate-300 hover:text-slate-200"
                  title={t('Yopish')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center gap-2 px-5 py-2.5 border-b border-slate-800/80 bg-slate-900/40 text-xs flex-shrink-0">
              <button
                type="button"
                onClick={() => setPreviewTab('content')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewTab === 'content'
                    ? 'liquid-btn-primary text-slate-100'
                    : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
                }`}
              >
                📄 {t('Asosiy Matn & Mazmun')}
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('params')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewTab === 'params'
                    ? 'liquid-btn-primary text-slate-100'
                    : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚙️ {t('Texnik Parametrlar')} ({previewDoc.technicalParameters?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setPreviewTab('chunks')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  previewTab === 'chunks'
                    ? 'liquid-btn-primary text-slate-100'
                    : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
                }`}
              >
                📑 {t('Matn parchalari')} ({previewChunks.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {/* Tab 1: Content */}
              {previewTab === 'content' && (
                <div className="space-y-4">
                  {/* Metadata Row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('Yuklagan Shaxs:')}</span>
                      <span className="font-semibold text-slate-200">{previewDoc.uploadedByName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('Sana:')}</span>
                      <span className="font-semibold text-slate-200">
                        {new Date(previewDoc.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('Hajmi:')}</span>
                      <span className="font-semibold text-slate-200">
                        {(previewDoc.fileSize / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t('Sahifa yoki varaq:')}</span>
                      <span className="font-semibold text-slate-200">
                        {previewDoc.pageCount ?? previewDoc.slideCount ?? t('aniqlanmagan')}
                      </span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-800/40 space-y-1.5">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {t('Ajratilgan matn bo‘yicha qisqa xulosa:')}
                    </span>
                    <p className="text-xs text-slate-300 leading-relaxed">{previewDoc.summary}</p>
                  </div>

                  {/* Full Extracted Chunks Text */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      {t('Hujjatning To‘liq Matni:')}
                    </h3>
                    {previewChunks.length > 0 ? (
                      <div className="space-y-3">
                        {previewChunks.map((c, i) => (
                          <div key={c.id || i} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400">
                              <span>{t('Qism')} #{i + 1} {c.sectionTitle ? `• ${c.sectionTitle}` : ''}</span>
                              <span>{t('Sahifa')}: {c.pageOrSlide ?? t('ko‘rsatilmagan')}</span>
                            </div>
                            <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-900/40 rounded-xl">
                        {t('Matn yuklanmoqda...')}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Technical Parameters */}
              {previewTab === 'params' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {t('Texnik Standartlar va O‘lchovlar:')}
                  </h3>
                  {previewDoc.technicalParameters && previewDoc.technicalParameters.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {previewDoc.technicalParameters.map((p, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">{p.key}</span>
                          <span className="font-mono font-bold text-cyan-300">{p.value} {p.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">{t('Texnik parametrlar kiritilmagan.')}</p>
                  )}
                </div>
              )}

              {/* Tab 3: RAG Chunks */}
              {previewTab === 'chunks' && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {t('Matn parchalari:')}
                  </h3>
                  <div className="space-y-3">
                    {previewChunks.map((chunk, idx) => (
                      <div key={chunk.id || idx} className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono text-[11px] text-emerald-400">
                          <span>{t('Fikr')} #{idx + 1}</span>
                          <span>{t('Sahifa / Slayd')}: {chunk.pageOrSlide ?? t('ko‘rsatilmagan')}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                          {chunk.text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between text-xs flex-shrink-0">
              <span className="text-slate-400 text-[11px]">
                {t('Manba holati va tekshiruv qaydi hujjat tafsilotlarida ko‘rsatiladi.')}
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-1.5 rounded-xl liquid-btn-ghost text-slate-200 text-xs font-semibold transition-all"
              >
                {t('Yopish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
