'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  CheckSquare,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Filter,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { Task, TaskStatus } from '@/types';

export function TasksView() {
  const {
    currentUser,
    setIsNewTaskModalOpen,
    allUsers,
    dataVersion,
    triggerDataRefresh,
    selectedDetailItem,
    t
  } = useApp();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/tasks', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error('Fetch tasks error:', e);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [dataVersion, fetchTasks]);

  const handleUpdateStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: taskId, status: newStatus })
      });
      if (res.ok) {
        fetchTasks();
        triggerDataRefresh();
      }
    } catch (e) {
      console.error('Task status update error:', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm(t('Vazifani o‘chirishni tasdiqlaysizmi?'))) {
      const res = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTasks();
        triggerDataRefresh();
      }
    }
  };

  const filteredTasks = tasks.filter(t => {
    const matchesAssignee = !assigneeFilter || t.assigneeId === assigneeFilter;
    const matchesPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;
    return matchesAssignee && matchesPriority;
  });

  const columns: { id: TaskStatus; label: string; color: string; badgeClass: string }[] = [
    { id: 'TODO', label: t('Rejalashtirilgan'), color: 'border-slate-800', badgeClass: 'bg-slate-800 text-slate-300' },
    { id: 'IN_PROGRESS', label: t('Jarayonda'), color: 'border-amber-600/40', badgeClass: 'glow-badge-amber' },
    { id: 'REVIEW', label: t('Tekshiruvda'), color: 'border-indigo-600/40', badgeClass: 'glow-badge-purple' },
    { id: 'DONE', label: t('Bajarildi'), color: 'border-emerald-600/40', badgeClass: 'glow-badge-emerald' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Banner - Liquid 3D Neumorphism */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 neu-card p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <CheckSquare className="w-4.5 h-4.5 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Vazifalar Taxtasi')}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {t('Laboratoriya xodimlarining topshiriqlari, ijro muddatlari va natijalari')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 text-xs liquid-input focus:outline-none"
          >
            <option value="">{t('Barcha xodimlar')}</option>
            {allUsers.map(u => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs liquid-input focus:outline-none"
          >
            <option value="ALL">{t('Barcha darajalar')}</option>
            <option value="Critical">{t('O‘ta muhim')}</option>
            <option value="High">{t('Yuqori')}</option>
            <option value="Medium">{t('O‘rta')}</option>
            <option value="Low">{t('Past')}</option>
          </select>

          {currentUser?.permissions.includes('tasks.create') && (
            <button
              onClick={() => setIsNewTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Yangi Vazifa')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Kanban 4 Columns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map(col => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className={`neu-card p-4 flex flex-col min-h-[480px] border ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
                <span className="text-xs font-bold text-slate-200">{col.label}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${col.badgeClass}`}>
                  {colTasks.length}
                </span>
              </div>

              {/* Tasks in Column */}
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {colTasks.map(task => {
                  const isHighlighted = selectedDetailItem?.type === 'task' && selectedDetailItem.id === task.id;
                  const isCritical = task.priority === 'Critical';
                  const isHigh = task.priority === 'High';
                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl transition-all space-y-2.5 ${
                        isHighlighted
                          ? 'neu-card-active'
                          : 'bg-slate-900/60 hover:bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-slate-950/80 text-cyan-400 font-bold border border-slate-800">
                          {task.projectName || t('Laboratoriya')}
                        </span>
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                            isCritical
                              ? 'glow-badge-rose'
                              : isHigh
                              ? 'glow-badge-amber'
                              : 'glow-badge-cyan'
                          }`}
                        >
                          {task.priority === 'Critical' ? t('O‘ta muhim') : task.priority === 'High' ? t('Yuqori') : task.priority === 'Medium' ? t('O‘rta') : t('Past')}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-200 leading-snug">{task.title}</h4>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          👤 {task.assigneeName}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-slate-400">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {task.deadline}
                        </span>
                      </div>

                      {/* Status movement controls */}
                      <div className="flex items-center justify-between pt-1 gap-1">
                        {col.id !== 'TODO' && (
                          <button
                            onClick={() => {
                              const prevStatus =
                                col.id === 'DONE' ? 'REVIEW' : col.id === 'REVIEW' ? 'IN_PROGRESS' : 'TODO';
                              handleUpdateStatus(task.id, prevStatus);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg liquid-btn-ghost"
                            title={t('Orqaga surish')}
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                        )}

                        <div className="flex-1" />

                        {col.id !== 'DONE' && (
                          <button
                            onClick={() => {
                              const nextStatus =
                                col.id === 'TODO'
                                  ? 'IN_PROGRESS'
                                  : col.id === 'IN_PROGRESS'
                                  ? 'REVIEW'
                                  : 'DONE';
                              handleUpdateStatus(task.id, nextStatus);
                            }}
                            className="px-2.5 py-1 text-[10px] font-semibold text-cyan-300 hover:text-slate-100 rounded-lg liquid-btn-primary flex items-center gap-1"
                          >
                            <span>{t('Olg‘a')}</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}

                        {currentUser?.permissions.includes('tasks.delete') && (
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors ml-1"
                            title={t('O‘chirish')}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {colTasks.length === 0 && (
                  <div className="p-8 text-center text-[11px] text-slate-500 border border-dashed border-slate-800/80 rounded-xl">
                    {t('Vazifalar mavjud emas')}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
