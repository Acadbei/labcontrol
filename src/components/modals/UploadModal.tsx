'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Upload,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { Project } from '@/types';

export function UploadModal() {
  const { isUploadModalOpen, setIsUploadModalOpen, setActiveTab, triggerDataRefresh } = useAppContext();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);

  useEffect(() => {
    if (isUploadModalOpen) {
      fetch('/api/projects')
        .then(r => r.json())
        .then((data: Project[]) => {
          if (Array.isArray(data) && data.length > 0) {
            setProjects(data);
            setProjectId(prev => prev || data[0].id);
          }
        })
        .catch(console.error);
    }
  }, [isUploadModalOpen]);

  if (!isUploadModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    if (projectId) formData.append('projectId', projectId);

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadResult({ success: true, doc: data.document });
        triggerDataRefresh();
      } else {
        const err = await res.json();
        setUploadResult({ success: false, error: err.error });
      }
    } catch (e: any) {
      setUploadResult({ success: false, error: e?.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsUploadModalOpen(false);
    setFile(null);
    setTitle('');
    setUploadResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-lg rounded-2xl p-6 border border-cyan-800/60 shadow-2xl space-y-5 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-slate-200">Laboratoriya Hujjatini Yuklash</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-200 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {uploadResult?.success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-200">Hujjat matni ajratildi</h4>
              <p className="text-xs text-slate-400 mt-1">
                {uploadResult.doc.wordCount} so‘z va {uploadResult.doc.chunksCount} ta parcha ajratildi. Manba alohida tekshirilib tasdiqlanmaguncha yordamchi undan foydalanmaydi.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  handleClose();
                  setActiveTab('documents');
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Hujjatlar bo‘limiga o‘tish
              </button>
              <button
                onClick={() => {
                  handleClose();
                  setActiveTab('chat');
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-slate-100 shadow-glow-cyan"
              >
                Yordamchi bilan savol-javob qilish
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-900/50 relative">
              <input
                type="file"
                required
                accept=".pdf,.docx,.pptx,.txt,.md,.csv"
                onChange={e => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    if (!title) setTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="flex flex-col items-center gap-2">
                <FileText className="w-8 h-8 text-cyan-400" />
                <p className="text-xs font-semibold text-slate-200">
                  {file ? file.name : 'Faylni tanlang yoki shu yerga tashlang'}
                </p>
                <p className="text-[10px] text-slate-400">
                  PDF, DOCX, PPTX, TXT, MD va CSV
                </p>
                {file && (
                  <span className="text-[10px] font-mono text-cyan-400 mt-1">
                    Hajmi: {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Hujjat Sarlavhasi</label>
              <input
                type="text"
                placeholder="Hujjat sarlavhasi"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Tegishli Loyiha</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {uploadResult?.error && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{uploadResult.error}</span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                disabled={!file || isUploading}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-100 font-semibold text-xs shadow-glow-cyan disabled:opacity-50 transition-all"
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Tahlil qilinmoqda (Parsing & RAG)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                <span>Yuklash va Indekslash</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
