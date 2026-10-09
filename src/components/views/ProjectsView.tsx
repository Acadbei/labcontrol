'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import {
  FolderKanban, Plus, Users, FileText, CheckCircle2,
  Calendar, Cpu, Trash2, ExternalLink, ChevronRight,
  Edit, UserPlus, UserMinus, Paperclip, X, CheckSquare,
  Eye, FileCheck, Activity, DollarSign, TrendingUp, Zap
} from 'lucide-react';
import { Project, User, DocumentEntity, TechnicalParameter, Priority, ProjectStatus, ProjectActivityStatus } from '@/types';
import { getActivityStatusInfo, formatBudget } from '@/lib/i18n';

export function ProjectsView() {
  const {
    currentUser, allUsers, setIsNewProjectModalOpen, setActiveTab,
    dataVersion, triggerDataRefresh, selectedDetailItem, setSelectedDetailItem,
    t, scriptMode
  } = useApp();

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [allDocuments, setAllDocuments] = useState<DocumentEntity[]>([]);

  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignMemberModalOpen, setIsAssignMemberModalOpen] = useState(false);
  const [isAttachDocModalOpen, setIsAttachDocModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ProjectStatus>('Active');
  const [editActivityStatus, setEditActivityStatus] = useState<ProjectActivityStatus>('active');
  const [editPriority, setEditPriority] = useState<Priority>('High');
  const [editDeadline, setEditDeadline] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editBudget, setEditBudget] = useState('');
  const [editBudgetCurrency, setEditBudgetCurrency] = useState('UZS');
  const [editParams, setEditParams] = useState<TechnicalParameter[]>([]);
  const [newParamKey, setNewParamKey] = useState('');
  const [newParamVal, setNewParamVal] = useState('');
  const [newParamUnit, setNewParamUnit] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Quick progress update
  const [quickProgressValue, setQuickProgressValue] = useState<number | null>(null);

  // Task form
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
  const [taskPriority, setTaskPriority] = useState<Priority>('High');
  const [taskDeadline, setTaskDeadline] = useState('');

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        setSelectedProject(prev => {
          if (!prev) return data.length > 0 ? data[0] : null;
          const found = data.find((p: Project) => p.id === prev.id);
          return found || (data.length > 0 ? data[0] : null);
        });
      }
    } catch (e) { console.error('Projects fetch error:', e); }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch('/api/documents', { cache: 'no-store' });
      if (res.ok) setAllDocuments(await res.json());
    } catch (e) { console.error('Documents fetch error:', e); }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchDocuments();
  }, [fetchProjects, fetchDocuments, dataVersion]);

  useEffect(() => {
    if (selectedDetailItem?.type === 'project' && projects.length > 0) {
      const target = projects.find(p => p.id === selectedDetailItem.id);
      if (target) setSelectedProject(target);
    }
  }, [selectedDetailItem, projects]);

  const openEditModal = (proj: Project) => {
    setEditName(proj.name);
    setEditCode(proj.code);
    setEditDescription(proj.description);
    setEditStatus(proj.status);
    setEditActivityStatus(proj.activityStatus || 'active');
    setEditPriority(proj.priority);
    setEditDeadline(proj.deadline);
    setEditProgress(proj.progressPercent || 0);
    setEditBudget(proj.estimatedBudget?.toString() || '');
    setEditBudgetCurrency(proj.budgetCurrency || 'UZS');
    setEditParams(proj.technicalParameters ? [...proj.technicalParameters] : []);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    setIsSaving(true);
    try {
      const budget = editBudget ? parseFloat(editBudget) : undefined;
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedProject.id,
          name: editName.trim(),
          code: editCode.trim().toUpperCase(),
          description: editDescription.trim(),
          status: editStatus,
          activityStatus: editActivityStatus,
          priority: editPriority,
          deadline: editDeadline,
          progressPercent: Math.round(editProgress),
          estimatedBudget: budget,
          budgetCurrency: editBudgetCurrency,
          technicalParameters: editParams
        })
      });
      if (res.ok) {
        setIsEditModalOpen(false);
        fetchProjects();
        triggerDataRefresh();
      } else {
        const err = await res.json();
        alert(err.error || "Loyihani saqlashda xatolik yuz berdi");
      }
    } catch (err: any) {
      console.error('Edit project error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (proj: Project) => {
    if (!confirm(`Haqiqatan ham «${proj.name}» loyihasini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      const res = await fetch(`/api/projects?id=${proj.id}`, { method: 'DELETE' });
      if (res.ok) { fetchProjects(); triggerDataRefresh(); }
      else { const err = await res.json(); alert(err.error || "Loyihani o'chirishda xatolik yuz berdi"); }
    } catch (err) { console.error('Delete project error:', err); }
  };

  const handleAssignMember = async (userId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_member', projectId: selectedProject.id, userId })
      });
      if (res.ok) { fetchProjects(); triggerDataRefresh(); setIsAssignMemberModalOpen(false); }
    } catch (err) { console.error('Assign member error:', err); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!selectedProject) return;
    if (!confirm("Ushbu xodimni loyiha jamoasidan chiqarishni tasdiqlaysizmi?")) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_member', projectId: selectedProject.id, userId })
      });
      if (res.ok) { fetchProjects(); triggerDataRefresh(); }
    } catch (err) { console.error('Remove member error:', err); }
  };

  const handleAttachDocument = async (docId: string) => {
    if (!selectedProject) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attach_document', projectId: selectedProject.id, docId })
      });
      if (res.ok) { fetchProjects(); fetchDocuments(); triggerDataRefresh(); setIsAttachDocModalOpen(false); }
    } catch (err) { console.error('Attach doc error:', err); }
  };

  const handleDetachDocument = async (docId: string) => {
    if (!selectedProject) return;
    if (!confirm("Ushbu hujjatni loyihadan ajratishni tasdiqlaysizmi?")) return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'detach_document', projectId: selectedProject.id, docId })
      });
      if (res.ok) { fetchProjects(); fetchDocuments(); triggerDataRefresh(); }
    } catch (err) { console.error('Detach doc error:', err); }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !taskTitle.trim()) return;
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskTitle.trim(), description: taskDesc.trim(),
          projectId: selectedProject.id,
          assigneeId: taskAssigneeId || (allUsers[0]?.id ?? 'user-1'),
          priority: taskPriority, deadline: taskDeadline, status: 'TODO'
        })
      });
      if (res.ok) {
        setTaskTitle(''); setTaskDesc(''); setIsNewTaskModalOpen(false);
        fetchProjects(); triggerDataRefresh();
      }
    } catch (err) { console.error('Create task error:', err); }
  };

  // Quick progress update inline
  const handleQuickProgressSave = async (proj: Project, value: number) => {
    try {
      await fetch('/api/projects', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: proj.id, progressPercent: Math.round(value) })
      });
      fetchProjects(); triggerDataRefresh();
    } catch (e) { console.error('Quick progress error:', e); }
  };

  const filteredProjects = projects.filter(p => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const getStatusLabel = (s: string) => {
    const map: Record<string, string> = {
      'Active': 'Faol', 'Testing': 'Sinovda', 'Planning': 'Rejalashtirilgan',
      'Completed': 'Yakunlangan', 'On Hold': "To'xtatilgan", 'Archived': 'Arxivlangan'
    };
    return t(map[s] || s);
  };

  const getStatusCss = (s: string) => {
    switch (s) {
      case 'Active': return 'liquid-status-active';
      case 'Testing': return 'liquid-status-testing';
      case 'Planning': return 'liquid-status-planning';
      case 'Completed': return 'liquid-status-completed';
      case 'On Hold': return 'liquid-status-onhold';
      default: return 'liquid-status-archived';
    }
  };

  const assignedTeamMembers = allUsers.filter(u => selectedProject?.teamIds?.includes(u.id));
  const unassignedTeamMembers = allUsers.filter(u => !selectedProject?.teamIds?.includes(u.id));
  const attachedDocuments = allDocuments.filter(d => d.projectId === selectedProject?.id);
  const unattachedDocuments = allDocuments.filter(d => d.projectId !== selectedProject?.id);

  const inputCls = "w-full px-3 py-2.5 text-xs liquid-input placeholder-slate-500 focus:outline-none";
  const labelCls = "block text-[11px] font-semibold text-slate-400 mb-1.5 tracking-wide uppercase";
  const sectionCls = "space-y-3 p-4 rounded-2xl bg-slate-950/40 border border-slate-800/60";

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 neu-card p-4 sm:p-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl liquid-btn-primary flex items-center justify-center flex-shrink-0">
              <FolderKanban className="w-4 h-4 text-slate-100" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-200 tracking-wide">
                {t('Loyihalar')}
              </h1>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t('Texnik parametrlar, chizmalar, biriktirilgan xodimlar, hujjatlar va vazifalar boshqaruvi')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 px-2 py-1 rounded-lg bg-slate-900/60 border border-slate-800/60">
            {filteredProjects.length} {t('ta loyihadan')}
          </span>
          {currentUser?.permissions.includes('projects.create') && (
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{t('Yangi Loyiha')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1">
        {[
          { id: 'ALL', label: t('Barcha Loyihalar') },
          { id: 'Active', label: t('Faol') },
          { id: 'Testing', label: t('Sinovda') },
          { id: 'Planning', label: t('Rejalashtirilgan') },
          { id: 'Completed', label: t('Yakunlangan') }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setStatusFilter(item.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 ${
              statusFilter === item.id
                ? 'liquid-btn-primary text-slate-100'
                : 'liquid-btn-ghost text-slate-400 hover:text-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Grid: Cards + Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Project Cards */}
        <div className="space-y-3 lg:col-span-1">
          {filteredProjects.length === 0 && (
            <div className="neu-card p-8 text-center">
              <FolderKanban className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500">{t('Loyihani tanlang')}</p>
            </div>
          )}
          {filteredProjects.map(proj => {
            const isSelected = selectedProject?.id === proj.id;
            const actInfo = getActivityStatusInfo(proj.activityStatus, scriptMode);
            const budget = formatBudget(proj.estimatedBudget, proj.budgetCurrency);
            return (
              <div
                key={proj.id}
                onClick={() => setSelectedProject(proj)}
                className={`p-4 rounded-2xl cursor-pointer transition-all duration-250 ${
                  isSelected ? 'neu-card-active' : 'neu-card'
                }`}
              >
                {/* Card header */}
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 px-2 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    {proj.code}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold ${getStatusCss(proj.status)}`}>
                      {getStatusLabel(proj.status)}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-bold text-slate-200 mb-1 leading-snug">{proj.name}</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                  {proj.description}
                </p>

                {/* Liquid Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-[10px] mb-1.5">
                    <span className="text-slate-500">{t('Progress')}</span>
                    <span className="font-mono font-bold text-cyan-400">{proj.progressPercent}%</span>
                  </div>
                  <div className="liquid-progress-track h-2">
                    <div
                      className="liquid-progress-fill h-full"
                      style={{ width: `${proj.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Activity + Stats */}
                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${actInfo.dot}`} />
                    <span className={actInfo.color}>{actInfo.labelText}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500">
                    <span className="flex items-center gap-0.5">
                      <Users className="w-3 h-3" />{proj.teamIds?.length || 1}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <FileText className="w-3 h-3" />{proj.documentsCount}
                    </span>
                    {budget && (
                      <span className="text-amber-400/80 font-mono">
                        💰 {budget}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Project Detail */}
        {selectedProject ? (
          <div className="lg:col-span-2 neu-card p-5 sm:p-6 space-y-5">
            {/* Project Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-800/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-mono font-bold text-cyan-400 px-2.5 py-0.5 rounded-lg bg-slate-950/60 border border-slate-800/60">
                    {selectedProject.code}
                  </span>
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold ${getStatusCss(selectedProject.status)}`}>
                    {getStatusLabel(selectedProject.status)}
                  </span>
                  {selectedProject.activityStatus && (() => {
                    const ai = getActivityStatusInfo(selectedProject.activityStatus, scriptMode);
                    return (
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1 ${ai.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ai.dot}`} />
                        <span className={ai.color}>{ai.labelText}</span>
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-200">{selectedProject.name}</h2>
                <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">{selectedProject.description}</p>

                {/* Meta row */}
                <div className="flex items-center flex-wrap gap-3 text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {t('Muddat')}: <span className="text-slate-300 ml-1 font-mono">{selectedProject.deadline}</span>
                  </span>
                  {selectedProject.estimatedBudget !== undefined && (
                    <span className="flex items-center gap-1 text-amber-400">
                      <DollarSign className="w-3.5 h-3.5" />
                      {formatBudget(selectedProject.estimatedBudget, selectedProject.budgetCurrency)}
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                {currentUser?.permissions.includes('projects.edit') && (
                  <button
                    onClick={() => openEditModal(selectedProject)}
                    className="px-3 py-1.5 rounded-xl liquid-btn-ghost text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('Tahrirlash')}</span>
                  </button>
                )}
                {currentUser?.permissions.includes('projects.delete') && (
                  <button
                    onClick={() => handleDeleteProject(selectedProject)}
                    className="px-3 py-1.5 rounded-xl liquid-btn-danger text-slate-100 text-xs font-semibold flex items-center gap-1.5"
                    title="Loyihani butunlay o'chirish"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t("O'chirish")}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('chat')}
                  className="px-3 py-1.5 rounded-xl liquid-btn-ghost text-cyan-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <span>{t('AI Yordamchida tahlil')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Progress Section */}
            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">{t('Progress')}</h3>
                </div>
                <span className="text-sm font-mono font-bold text-cyan-400">{selectedProject.progressPercent}%</span>
              </div>
              {/* Liquid progress bar */}
              <div className="liquid-progress-track h-3">
                <div
                  className="liquid-progress-fill h-full"
                  style={{ width: `${selectedProject.progressPercent}%` }}
                />
              </div>
              {/* Quick slider */}
              {currentUser?.permissions.includes('projects.edit') && (
                <div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    defaultValue={selectedProject.progressPercent}
                    key={selectedProject.id + selectedProject.progressPercent}
                    onChange={e => setQuickProgressValue(Number(e.target.value))}
                    onMouseUp={e => {
                      const val = Number((e.target as HTMLInputElement).value);
                      handleQuickProgressSave(selectedProject, val);
                    }}
                    onTouchEnd={e => {
                      const val = Number((e.target as HTMLInputElement).value);
                      handleQuickProgressSave(selectedProject, val);
                    }}
                    className="liquid-slider w-full"
                  />
                  <div className="flex items-center gap-1.5 mt-2">
                    {[0, 25, 50, 75, 100].map(v => (
                      <button
                        key={v}
                        onClick={() => handleQuickProgressSave(selectedProject, v)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          selectedProject.progressPercent === v
                            ? 'liquid-btn-primary text-slate-100'
                            : 'liquid-btn-ghost text-slate-400 hover:text-cyan-400'
                        }`}
                      >
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Section 1: Team Members */}
            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {t('Biriktirilgan Ishchilar & Mutaxassislar')} ({assignedTeamMembers.length})
                  </h3>
                </div>
                {currentUser?.permissions.includes('projects.edit') && (
                  <button
                    onClick={() => setIsAssignMemberModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg liquid-btn-ghost text-purple-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                    <span>{t('+ Yangi Ishchi Biriktirish')}</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {assignedTeamMembers.map(member => (
                  <div
                    key={member.id}
                    className="p-2.5 rounded-xl neu-card flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-slate-100 flex-shrink-0 shadow-sm">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-200 truncate">{member.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{member.position}</div>
                      </div>
                    </div>
                    {currentUser?.permissions.includes('projects.edit') && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors flex-shrink-0"
                        title="Loyihadan chiqarish"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Documents */}
            <div className={sectionCls}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    {t('Biriktirilgan Hujjatlar & Chizmalar')} ({attachedDocuments.length})
                  </h3>
                </div>
                {currentUser?.permissions.includes('projects.edit') && (
                  <button
                    onClick={() => setIsAttachDocModalOpen(true)}
                    className="px-2.5 py-1 rounded-lg liquid-btn-ghost text-cyan-300 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{t('+ Hujjat Biriktirish')}</span>
                  </button>
                )}
              </div>
              {attachedDocuments.length === 0 ? (
                <p className="text-xs text-slate-600 italic py-1">
                  {t("Hozircha ushbu loyihaga alohida hujjat biriktirilmagan.")}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {attachedDocuments.map(doc => (
                    <div key={doc.id} className="p-2.5 rounded-xl neu-card flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">{doc.title}</div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">{doc.originalName}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => { setSelectedDetailItem({ type: 'document', id: doc.id }); setActiveTab('documents'); }}
                          className="p-1.5 text-slate-500 hover:text-cyan-400 rounded-lg hover:bg-slate-800/60 transition-colors"
                          title="Hujjatni ko'rish"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {currentUser?.permissions.includes('projects.edit') && (
                          <button
                            onClick={() => handleDetachDocument(doc.id)}
                            className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                            title="Loyihadan ajratish"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Technical Parameters */}
            {selectedProject.technicalParameters?.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-bold text-slate-200 tracking-wider uppercase">
                    {t('Texnik Parametrlar & Xususiyatlar')}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedProject.technicalParameters.map((param, idx) => (
                    <div key={idx} className="p-3 rounded-xl neu-card flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 truncate mr-2">{param.key}</span>
                      <span className="text-[11px] font-mono font-bold text-cyan-300 flex-shrink-0">
                        {param.value} {param.unit || ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {currentUser?.permissions.includes('tasks.create') && (
                  <button
                    onClick={() => setIsNewTaskModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl liquid-btn-primary text-slate-100 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('+ Ushbu Loyihaga Vazifa Biriktirish')}</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="px-3.5 py-2 rounded-xl liquid-btn-ghost text-slate-300 text-xs font-medium"
                >
                  {t('Barcha vazifalar')} ({selectedProject.tasksCount})
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 neu-card p-12 text-center text-slate-600">
            <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">{t('Loyihani tanlang')}</p>
          </div>
        )}
      </div>

      {/* ===== MODAL 1: EDIT PROJECT ===== */}
      {isEditModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-modal-backdrop">
          <div className="liquid-modal w-full max-w-lg animate-modal-in max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800/60 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-200">{t('Loyihani Tahrirlash')}</h3>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="w-7 h-7 rounded-lg liquid-btn-ghost flex items-center justify-center text-slate-400 hover:text-slate-200">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 p-5 space-y-4 text-xs">
              <div>
                <label className={labelCls}>{t('Loyiha Nomi')}</label>
                <input type="text" required value={editName} onChange={e => setEditName(e.target.value)} className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('Loyiha Kodi')}</label>
                  <input type="text" required value={editCode} onChange={e => setEditCode(e.target.value)} className={inputCls + " font-mono font-bold"} />
                </div>
                <div>
                  <label className={labelCls}>{t('Holati')}</label>
                  <select value={editStatus} onChange={e => setEditStatus(e.target.value as ProjectStatus)} className={inputCls}>
                    <option value="Active">{t('Faol')}</option>
                    <option value="Testing">{t('Sinovda')}</option>
                    <option value="Planning">{t('Rejalashtirilgan')}</option>
                    <option value="Completed">{t('Yakunlangan')}</option>
                    <option value="On Hold">{t("To'xtatilgan")}</option>
                    <option value="Archived">{t('Arxivlangan')}</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('Aktivlik holati')}</label>
                  <select value={editActivityStatus} onChange={e => setEditActivityStatus(e.target.value as ProjectActivityStatus)} className={inputCls}>
                    <option value="active">{scriptMode === 'latin' ? 'Faol' : 'Фаол'}</option>
                    <option value="inactive">{scriptMode === 'latin' ? 'Faol emas' : 'Фаол эмас'}</option>
                    <option value="pending">{scriptMode === 'latin' ? 'Kutilmoqda' : 'Кутилмоқда'}</option>
                    <option value="completed">{scriptMode === 'latin' ? 'Yakunlandi' : 'Якунланди'}</option>
                    <option value="suspended">{scriptMode === 'latin' ? 'Muzlatilgan' : 'Музлатилган'}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('Muhimlik Darajasi')}</label>
                  <select value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)} className={inputCls}>
                    <option value="Critical">{t("O'ta muhim")}</option>
                    <option value="High">{t('Yuqori')}</option>
                    <option value="Medium">{t("O'rta")}</option>
                    <option value="Low">{t('Past')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('Topshirish Muddati')}</label>
                <input type="date" required value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('Tavsif')}</label>
                <textarea rows={3} value={editDescription} onChange={e => setEditDescription(e.target.value)} className={inputCls + " resize-none"} />
              </div>

              {/* Progress in edit */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={labelCls + " mb-0"}>{t('Progress')}</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{editProgress}%</span>
                </div>
                <div className="liquid-progress-track h-2 mb-2">
                  <div className="liquid-progress-fill h-full" style={{ width: `${editProgress}%` }} />
                </div>
                <input
                  type="range" min={0} max={100} step={5} value={editProgress}
                  onChange={e => setEditProgress(Number(e.target.value))}
                  className="liquid-slider w-full"
                />
              </div>

              {/* Budget in edit */}
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className={labelCls}>{t("Taxminiy Mablag' (ixtiyoriy)")}</label>
                  <input type="number" min={0} placeholder="30000000" value={editBudget} onChange={e => setEditBudget(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>{t('Valyuta')}</label>
                  <select value={editBudgetCurrency} onChange={e => setEditBudgetCurrency(e.target.value)} className={inputCls}>
                    <option value="UZS">UZS</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* Technical Parameters in edit */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-slate-400 block">{t('Texnik Parametrlar:')}</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {editParams.map((p, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-950/50 border border-slate-800/60 text-[11px]">
                      <span className="text-slate-300 font-semibold">{p.key}: <span className="text-cyan-300 font-mono">{p.value} {p.unit || ''}</span></span>
                      <button type="button" onClick={() => setEditParams(prev => prev.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-300 ml-2">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="text" placeholder="Kalit" value={newParamKey} onChange={e => setNewParamKey(e.target.value)} className="flex-1 px-2.5 py-2 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-200 text-[11px]" />
                  <input type="text" placeholder="Qiymat" value={newParamVal} onChange={e => setNewParamVal(e.target.value)} className="flex-1 px-2.5 py-2 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-200 text-[11px]" />
                  <input type="text" placeholder="Birlik" value={newParamUnit} onChange={e => setNewParamUnit(e.target.value)} className="w-20 px-2 py-2 bg-slate-950/60 border border-slate-800/60 rounded-xl text-slate-200 text-[11px]" />
                  <button
                    type="button"
                    onClick={() => {
                      if (newParamKey && newParamVal) {
                        setEditParams(prev => [...prev, { key: newParamKey.trim(), value: newParamVal.trim(), unit: newParamUnit.trim() }]);
                        setNewParamKey(''); setNewParamVal(''); setNewParamUnit('');
                      }
                    }}
                    className="px-2.5 py-2 rounded-xl liquid-btn-primary text-slate-100 text-xs font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 rounded-xl liquid-btn-ghost text-slate-300 font-medium text-xs">
                  {t('Bekor qilish')}
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50">
                  {isSaving ? <><div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-transparent rounded-full animate-spin" /><span>{t('Saqlanmoqda...')}</span></> : <span>{t("O'zgarishlarni Saqlash")}</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== MODAL 2: ASSIGN MEMBER ===== */}
      {isAssignMemberModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-modal-backdrop">
          <div className="liquid-modal w-full max-w-md animate-modal-in p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-200">{t('Loyihaga Xodim Biriktirish')}</h3>
              </div>
              <button onClick={() => setIsAssignMemberModalOpen(false)} className="w-7 h-7 rounded-lg liquid-btn-ghost flex items-center justify-center text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">«{selectedProject.name}» loyihasi uchun yangi mutaxassisni tanlang:</p>
            {unassignedTeamMembers.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">{t('Barcha laboratoriya xodimlari ushbu loyihaga biriktirilgan.')}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unassignedTeamMembers.map(user => (
                  <button
                    key={user.id}
                    onClick={() => handleAssignMember(user.id)}
                    className="w-full p-2.5 rounded-xl neu-card hover:neu-card-active flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-slate-100 flex items-center justify-center font-bold text-xs">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-purple-300">{user.name}</div>
                        <div className="text-[10px] text-slate-500">{user.position}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-purple-400 px-2 py-0.5 rounded-lg liquid-badge-completed">
                      {t('Biriktirish +')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL 3: ATTACH DOCUMENT ===== */}
      {isAttachDocModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-modal-backdrop">
          <div className="liquid-modal w-full max-w-md animate-modal-in p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">{t('Loyihaga Hujjat Biriktirish')}</h3>
              </div>
              <button onClick={() => setIsAttachDocModalOpen(false)} className="w-7 h-7 rounded-lg liquid-btn-ghost flex items-center justify-center text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-xs text-slate-400">Mavjud hujjatlardan «{selectedProject.name}» loyihasiga bog'lashni tanlang:</p>
            {unattachedDocuments.length === 0 ? (
              <p className="text-xs text-slate-600 italic py-4 text-center">{t('Barcha mavjud hujjatlar ushbu loyihaga biriktirilgan.')}</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {unattachedDocuments.map(doc => (
                  <button
                    key={doc.id}
                    onClick={() => handleAttachDocument(doc.id)}
                    className="w-full p-2.5 rounded-xl neu-card flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileCheck className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 truncate">{doc.title}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{doc.originalName}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold text-cyan-400 px-2 py-0.5 rounded-lg liquid-status-planning flex-shrink-0 ml-2">
                      + {t('Biriktirish +')}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL 4: NEW TASK ===== */}
      {isNewTaskModalOpen && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 liquid-modal-backdrop">
          <div className="liquid-modal w-full max-w-md animate-modal-in p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">{t('Loyihaga Yangi Vazifa Biriktirish')}</h3>
              </div>
              <button onClick={() => setIsNewTaskModalOpen(false)} className="w-7 h-7 rounded-lg liquid-btn-ghost flex items-center justify-center text-slate-400">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs">
              <div>
                <label className={labelCls}>{t('Vazifa Mavzusi')}</label>
                <input type="text" required placeholder="masalan: D16T korpusining 3D modelini chizish" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t('Ijrochi Mutaxassis')}</label>
                <select value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)} className={inputCls}>
                  {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} — {u.position}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>{t('Muhimlik')}</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as Priority)} className={inputCls}>
                    <option value="Critical">{t("O'ta muhim")}</option>
                    <option value="High">{t('Yuqori')}</option>
                    <option value="Medium">{t("O'rta")}</option>
                    <option value="Low">{t('Past')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>{t('Muddat')}</label>
                  <input type="date" required value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>{t('Batafsil topshiriq')}</label>
                <textarea rows={2} placeholder="Qo'shimcha texnik talablar..." value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className={inputCls + " resize-none"} />
              </div>
              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="px-4 py-2 rounded-xl liquid-btn-ghost text-slate-300 font-medium text-xs">
                  {t('Bekor qilish')}
                </button>
                <button type="submit" className="px-5 py-2 rounded-xl liquid-btn-primary text-slate-100 font-semibold text-xs">
                  {t('Vazifani Biriktirish')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
