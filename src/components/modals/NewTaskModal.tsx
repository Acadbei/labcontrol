'use client';

import React, { useState, useEffect } from 'react';
import { useAppContext } from '@/context/AppContext';
import { CheckSquare, X, Plus, Calendar, AlertCircle } from 'lucide-react';
import { Priority, TaskStatus, Project } from '@/types';

export function NewTaskModal() {
  const { isNewTaskModalOpen, setIsNewTaskModalOpen, allUsers, setActiveTab, triggerDataRefresh, currentUser } = useAppContext();
  const defaultDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  };
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [priority, setPriority] = useState<Priority>('High');
  const [deadline, setDeadline] = useState(defaultDate());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isNewTaskModalOpen) {
      setDeadline(prev => prev || defaultDate());
      if (currentUser?.id && !assigneeId) {
        setAssigneeId(currentUser.id);
      }
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
  }, [isNewTaskModalOpen, currentUser?.id]);

  if (!isNewTaskModalOpen || !currentUser?.permissions.includes('tasks.create')) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const targetProjectId = projectId || (projects[0]?.id ?? '');
      const targetAssigneeId = assigneeId || (currentUser?.id ?? allUsers[0]?.id ?? '');
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          assigneeId: targetAssigneeId,
          projectId: targetProjectId,
          priority,
          deadline: deadline || defaultDate(),
          status: 'TODO'
        })
      });

      if (res.ok) {
        triggerDataRefresh();
        setIsNewTaskModalOpen(false);
        setTitle('');
        setDescription('');
        setActiveTab('tasks');
      } else {
        const err = await res.json();
        setError(err.error || 'Vazifani yaratishda xatolik yuz berdi');
      }
    } catch (e: any) {
      console.error('Create task error:', e);
      setError(e?.message || 'Server bilan bog‘lanishda xatolik');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="glass-panel-glow w-full max-w-lg rounded-2xl p-6 border border-emerald-800/60 shadow-2xl space-y-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-slate-200">Yangi Laboratoriya Vazifasi</h3>
          </div>
          <button
            onClick={() => setIsNewTaskModalOpen(false)}
            className="text-slate-400 hover:text-slate-200 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Vazifa Nomi *
            </label>
            <input
              type="text"
              required
              placeholder="Masalan: ESP32-S3 uchun bosim sensori drayverini yozish"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Batafsil Tavsif & Talablar
            </label>
            <textarea
              rows={3}
              placeholder="Vazifa tafsilotlari, kerakli parametrlar yoki chizmalar havolasi..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Mas’ul Xodim (Assignee)
              </label>
              <select
                value={assigneeId}
                onChange={e => setAssigneeId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Tanlang...</option>
                {allUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.position})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Loyiha</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.code}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Ustuvorlik</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="Low">Past (Low)</option>
                <option value="Medium">O‘rta (Medium)</option>
                <option value="High">Yuqori (High)</option>
                <option value="Critical">O‘ta muhim (Critical)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Muddat</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewTaskModalOpen(false)}
              className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-100 font-semibold text-xs shadow-md transition-all"
            >
              {isSubmitting ? 'Saqlanmoqda...' : 'Vazifani Biriktirish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
