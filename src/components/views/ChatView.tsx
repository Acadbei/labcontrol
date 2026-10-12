'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import {
  Sparkles,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Cpu,
  Trash2,
  Bookmark,
  Shield,
  Layers,
  Check,
  ExternalLink,
  Download,
  X,
  Plus,
  MessageSquare,
  Clock,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Lightbulb,
  Users
} from 'lucide-react';
import { ChatMessage, Citation, Project } from '@/types';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { PcmAudioStreamPlayer } from '@/lib/tts-client';

interface ChatSession {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
  projectId?: string;
}

export function ChatView() {
  const { currentUser, setActiveTab, setSelectedDetailItem, triggerDataRefresh, t, scriptMode } = useAppContext();

  // Sessions state: previous chats
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  // activeSessionId: null means "Yangi muloqot" (New Chat) is active
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Input & loading states
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [actionStatus, setActionStatus] = useState<Record<string, string>>({});
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Voice Assistant states (STT / TTS)
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [autoVoiceReply, setAutoVoiceReply] = useState(false);
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<'Kore' | 'Puck'>('Kore');
  const [voiceNotice, setVoiceNotice] = useState('');
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<PcmAudioStreamPlayer | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const historyToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => audioPlayerRef.current?.stop(), []);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsSidebarOpen(false);
      historyToggleRef.current?.focus();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isSidebarOpen]);

  // Load this account's history from the server; no browser-shared chat cache.
  useEffect(() => {
    try {
      const savedVoice = localStorage.getItem('labcontrol_auto_voice');
      setAutoVoiceReply(savedVoice === 'true');
    } catch {}

    try {
      const savedModel = localStorage.getItem('labcontrol_voice_model');
      if (savedModel === 'Puck' || savedModel === 'uz-UZ-SardorNeural') setSelectedVoiceModel('Puck');
      else if (savedModel === 'Kore' || savedModel === 'uz-UZ-MadinaNeural') setSelectedVoiceModel('Kore');
    } catch {}

    fetch('/api/ai/chat', { cache: 'no-store' }).then(async response => {
      if (!response.ok) return;
      const history = await response.json();
      if (!Array.isArray(history) || history.length === 0) return;
      const last = history[history.length - 1];
      const session: ChatSession = { id: 'account-history', title: 'Joriy hisob chat tarixi', updatedAt: last.timestamp, messages: history };
      setSessions([session]);
      setActiveSessionId(session.id);
    }).catch(() => setSessions([]));
  }, []);

  // Load projects list
  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(console.error);
  }, []);


  // Toggle Auto Voice Reply
  const toggleAutoVoiceReply = () => {
    const nextVal = !autoVoiceReply;
    setAutoVoiceReply(nextVal);
    setVoiceNotice('');
    try {
      localStorage.setItem('labcontrol_auto_voice', String(nextVal));
    } catch {}
    if (!nextVal) {
      audioPlayerRef.current?.stop();
      audioPlayerRef.current = null;
      setSpeakingMsgId(null);
    }
  };

  // Select the voice: Madina (Kore) or Sardor (Puck)
  const handleSelectVoiceModel = (model: 'Kore' | 'Puck') => {
    setSelectedVoiceModel(model);
    try {
      localStorage.setItem('labcontrol_voice_model', model);
    } catch {}
    audioPlayerRef.current?.stop();
    audioPlayerRef.current = null;
    setSpeakingMsgId(null);
  };

  // Edge-TTS with fallback to browser SpeechSynthesis
  const speakText = async (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      audioPlayerRef.current?.stop();
      audioPlayerRef.current = null;
      setSpeakingMsgId(null);
      return;
    }

    audioPlayerRef.current?.stop();
    const player = new PcmAudioStreamPlayer();
    audioPlayerRef.current = player;
    setSpeakingMsgId(msgId);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: selectedVoiceModel === 'Puck' ? 'uz-UZ-SardorNeural' : 'uz-UZ-MadinaNeural'
        }),
        signal: player.signal
      });
      await player.play(res, text);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setVoiceNotice(error instanceof Error ? error.message : 'TTS xizmati javob bermadi.');
      }
    } finally {
      player.stop();
      if (audioPlayerRef.current === player) {
        audioPlayerRef.current = null;
        setSpeakingMsgId(null);
      }
    }
  };

  // Speech-to-Text (STT): Listen to user voice via Web Speech API
  const toggleListening = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Brauzeringiz ovozli tanib olishni (STT) qo‘llab-quvvatlamaydi. Iltimos, Google Chrome yoki Microsoft Edge brauzeridan foydalaning.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Speech recognition start failed:', err);
      setIsListening(false);
    }
  };

  // Computed messages for active session
  const currentSession = sessions.find(s => s.id === activeSessionId) || null;
  const currentMessages = currentSession ? currentSession.messages : [];

  // Smooth internal scroll WITHOUT window jump
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [currentMessages.length, isLoading, activeSessionId]);

  const handleClearAllHistory = async () => {
    if (!confirm('Faqat joriy hisobingizdagi chat tarixi o‘chiriladi. Davom etasizmi?')) return;
    const response = await fetch('/api/ai/chat', { method: 'DELETE' });
    if (!response.ok) { alert('Chat tarixini o‘chirib bo‘lmadi'); return; }
    setSessions([]);
    setActiveSessionId(null);
    setInput('');
    triggerDataRefresh();
  };

  const handleStartNewChat = () => {
    if (currentMessages.length > 0) void handleClearAllHistory();
    else { setActiveSessionId(null); setInput(''); }
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = (sessionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (sessions.some(session => session.id === sessionId)) void handleClearAllHistory();
  };

  const handleSend = async (event?: React.FormEvent, customPrompt?: string, useAsadbekGpt = false) => {
    if (event) event.preventDefault();
    const prompt = (customPrompt || input).trim();
    if (!prompt || isLoading) return;
    setInput('');
    setIsLoading(true);
    const targetSessionId = activeSessionId || 'account-history';
    const temporaryMessage: ChatMessage = { id: `temp-${Date.now()}`, role: 'user', content: prompt, timestamp: new Date().toISOString() };
    setActiveSessionId(targetSessionId);
    setSessions(current => current.length ? current.map(session => ({ ...session, messages: [...session.messages, temporaryMessage] })) : [{ id: targetSessionId, title: prompt.slice(0, 48), updatedAt: new Date().toISOString(), messages: [temporaryMessage] }]);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectId: selectedProjectId || undefined, useAsadbekGpt, consent: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Javob qaytmadi');
      const pair = [data.userMessage, data.assistantMessage].filter(Boolean) as ChatMessage[];
      setSessions(current => current.map(session => ({ ...session, updatedAt: data.assistantMessage?.timestamp || new Date().toISOString(), messages: [...session.messages.filter(message => message.id !== temporaryMessage.id), ...pair] })));
      triggerDataRefresh();
      if (data.assistantMessage?.actionProposal?.parameters?.created) {
        triggerDataRefresh();
      }
      if (autoVoiceReply && data.assistantMessage?.content) speakText(data.assistantMessage.content, data.assistantMessage.id);
    } catch (error: any) {
      setSessions(current => current.map(session => ({ ...session, messages: session.messages.filter(message => message.id !== temporaryMessage.id) })));
      alert(error?.message || 'Yordamchi so‘rovni bajara olmadi');
    } finally { setIsLoading(false); }
  };

  const handleOpenCitation = (c: Citation) => {
    if (c.sourceType === 'knowledge') {
      handleNavigateToKnowledge();
    } else if (c.sourceType === 'project' && c.sourceId) {
      setSelectedDetailItem({ type: 'project', id: c.sourceId });
      setActiveTab('projects');
    } else if (c.sourceType === 'task' && c.sourceId) {
      setSelectedDetailItem({ type: 'task', id: c.sourceId });
      setActiveTab('tasks');
    } else if (c.sourceType === 'staff') {
      setActiveTab('team');
    } else if (c.sourceType === 'activity') {
      setActiveTab('activity');
    } else {
      setSelectedCitation(c);
    }
  };

  const handleNavigateToDocument = (docId?: string) => {
    if (docId) {
      setSelectedDetailItem({ type: 'document', id: docId });
    }
    setActiveTab('documents');
    setSelectedCitation(null);
  };

  const handleNavigateToKnowledge = () => {
    setActiveTab('knowledge');
    setSelectedCitation(null);
  };

  const handleExecuteAction = async (msgId: string, actionProposal: any) => {
    setActionStatus(prev => ({ ...prev, [msgId]: 'executing' }));
    try {
      const res = await fetch('/api/ai/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType: actionProposal.actionType,
          parameters: actionProposal.parameters,
          confirmed: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        setActionStatus(prev => ({ ...prev, [msgId]: `success: ${data.task?.title || 'Vazifa yaratildi'}` }));
        triggerDataRefresh();
      } else {
        const err = await res.json();
        setActionStatus(prev => ({ ...prev, [msgId]: `error: ${err.error || 'Xatolik yuz berdi'}` }));
      }
    } catch (e: any) {
      setActionStatus(prev => ({ ...prev, [msgId]: `error: ${e?.message || 'Xatolik'}` }));
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] glass-panel rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden relative shadow-sm">
      {isSidebarOpen && <button
        type="button"
        aria-label="Chat tarixini yopish"
        onClick={() => setIsSidebarOpen(false)}
        className="absolute inset-0 z-10 bg-slate-950/35 md:hidden"
      />}
      {/* 1. LEFT SIDEBAR: ESKI CHATLAR VA YANGI CHAT TUGMASI */}
      <div
        id="chat-history-panel"
        aria-label="Chat tarixi"
        className={`${
          isSidebarOpen ? 'absolute inset-y-0 left-0 w-[min(84vw,18rem)] sm:w-72 md:relative md:inset-auto md:w-72' : 'hidden md:relative md:flex md:w-14'
        } border-r border-slate-200 dark:border-slate-800/80 bg-slate-50/95 dark:bg-slate-950/70 flex flex-col justify-between transition-all duration-200 flex-shrink-0 z-20 overflow-hidden`}
      >
        {isSidebarOpen ? (
          <>
            {/* Top: New Chat Trigger */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase font-mono">
                  Muloqotlar
                </span>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 md:hidden"
                  title="Yopish"
                  aria-label="Chat tarixini yopish"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleStartNewChat}
                className={`w-full py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                  activeSessionId === null
                    ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-slate-200 shadow-glow-cyan'
                    : 'bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700/80 text-cyan-700 dark:text-cyan-300'
                }`}
              >
                <Plus className="w-4 h-4" />
                <span>+ Yangi Muloqot</span>
              </button>
            </div>

            {/* List of Old Chats (Eski Chatlar) */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-1 text-xs">
              <div className="px-2 py-1 text-[10px] font-mono tracking-wider uppercase text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between">
                <span>Eski Chatlar ({sessions.length})</span>
                <Clock className="w-3 h-3 text-slate-400" />
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs px-2">
                  Hozircha eski chatlar mavjud emas. Yuqoridagi tugma orqali yangi chat boshlang.
                </div>
              ) : (
                sessions.map(sess => {
                  const isActive = activeSessionId === sess.id;
                  return (
                    <div
                      key={sess.id}
                      onClick={() => setActiveSessionId(sess.id)}
                      className={`group flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isActive
                          ? 'bg-cyan-100 dark:bg-cyan-950/60 border-cyan-300 dark:border-cyan-700/60 text-cyan-950 dark:text-cyan-200 font-semibold shadow-xs'
                          : 'bg-white dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/90 border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 flex-shrink-0 ${
                            isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400'
                          }`}
                        />
                        <span className="truncate font-medium text-xs">
                          {sess.title}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={e => handleDeleteSession(sess.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-rose-500 transition-all flex-shrink-0"
                        title="O‘chirish"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Actions */}
            <div className="p-2.5 border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/90 dark:bg-slate-950/90 flex items-center justify-between">
              <button
                onClick={handleClearAllHistory}
                className="text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-900 transition-colors"
                title="Barcha eski chatlarni tozalash"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tarixni tozalash</span>
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hidden md:block"
                title="Panelni yashirish"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          /* Collapsed Mini Sidebar */
          <div className="py-3 flex flex-col items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-cyan-600 dark:text-cyan-400 shadow-xs"
              title="Eski chatlar panelini ochish"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartNewChat}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-200 shadow-sm"
              title="+ Yangi muloqot"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. RIGHT MAIN CHAT AREA: HOZIRGI YANGI CHAT YOKI TANLANGAN ESKI CHAT */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent relative">
        {/* Chat Top Header */}
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {!isSidebarOpen && (
              <button
                ref={historyToggleRef}
                onClick={() => setIsSidebarOpen(true)}
                className="p-1.5 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                title="Eski chatlarni ochish"
                aria-label="Chat tarixini ochish"
                aria-controls="chat-history-panel"
                aria-expanded={isSidebarOpen}
              >
                <PanelLeftOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              </button>
            )}

            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-glow-cyan text-slate-200 flex-shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-200" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {currentSession ? currentSession.title : 'LabControl Yordamchi'}
                </h2>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-mono font-semibold glow-badge-cyan">
                  MANBA QIDIRUVI
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Kirish ruxsatingiz doirasidagi hujjatlar va bilimlar bazasi qidiriladi.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
            {/* Gemini TTS ovozlari: Kore = Sevara, Puck = Asadbek */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => handleSelectVoiceModel('Kore')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                  selectedVoiceModel === 'Kore'
                    ? 'bg-white dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 shadow-xs border border-cyan-300 dark:border-cyan-800 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Madina (O‘zbek ayol ovozi - Edge-TTS)"
              >
                🎙️ Madina
              </button>
              <button
                type="button"
                onClick={() => handleSelectVoiceModel('Puck')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                  selectedVoiceModel === 'Puck'
                    ? 'bg-white dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 shadow-xs border border-cyan-300 dark:border-cyan-800 font-semibold'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
                title="Sardor (O‘zbek erkak ovozi - Edge-TTS)"
              >
                🎙️ Sardor
              </button>
            </div>

            {/* Ovozli javob avtomatik o'qish tugmasi */}
            <button
              type="button"
              onClick={toggleAutoVoiceReply}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                autoVoiceReply
                  ? 'bg-cyan-100 dark:bg-cyan-950 text-cyan-900 dark:text-cyan-200 border-cyan-300 dark:border-cyan-700 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title={autoVoiceReply ? "Ovozli avto-o‘qish yoqilgan (Har bir javob ovozda o‘qiladi)" : "Ovozli avto-o‘qish o‘chirilgan"}
            >
              {autoVoiceReply ? <Volume2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden sm:inline">{autoVoiceReply ? 'Ovoz: Faol' : 'Ovoz: O‘chiq'}</span>
            </button>

            {/* Project filter selector */}
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-300 focus:outline-none focus:border-cyan-500 shadow-xs"
            >
              <option value="">Barcha loyihalar</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>
          {voiceNotice && <p className="basis-full px-3 pb-2 text-[11px] text-amber-700 dark:text-amber-300" role="status">{voiceNotice}</p>}
        </div>

        {/* Messages Container */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* If activeSession is New Chat and has no messages, show welcome hero */}
          {currentMessages.length === 0 && (
            <div className="max-w-xl mx-auto py-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 mx-auto flex items-center justify-center shadow-glow-cyan text-slate-200">
                <Sparkles className="w-7 h-7 text-cyan-200" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                  LabControl yordamchisi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
                  Javob ruxsatli hujjatlar, bilimlar, loyihalar va vazifalardan topilgan manbalarga asoslanadi.
                </p>
              </div>

            </div>
          )}

          {/* Render Active Session Messages */}
          {currentMessages.map(msg => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isUser
                      ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-slate-200 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-cyan-800/40 shadow-glow-cyan'
                  }`}
                >
                  {isUser ? (currentUser?.name ? currentUser.name.charAt(0) : 'U') : <Cpu className="w-4 h-4" />}
                </div>

                <div className="space-y-2 max-w-2xl min-w-0">
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      isUser
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500/30 text-slate-200 rounded-tr-none shadow-sm'
                        : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm relative group/bubble'
                    }`}
                  >
                    {/* Top right message actions (Ovozda eshitish) */}
                    {!isUser && (
                      <div className="flex items-center justify-end pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => speakText(msg.content, msg.id)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-all border ${
                            speakingMsgId === msg.id
                              ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 animate-pulse'
                              : 'bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-400 hover:text-cyan-700 dark:hover:text-cyan-300 border-slate-200 dark:border-slate-700'
                          }`}
                          title={speakingMsgId === msg.id ? "Ovozni to‘xtatish" : "Ovozda eshitish (TTS)"}
                        >
                          {speakingMsgId === msg.id ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{speakingMsgId === msg.id ? 'To‘xtatish' : 'Ovozda o‘qish'}</span>
                        </button>
                      </div>
                    )}

                    <MarkdownContent content={msg.content} />

                    {/* AsadbekGPT Fallback Quick Action Trigger */}
                    {!isUser && (msg.content.includes('AsadbekGPT orqali qidirilsinmi?') || msg.content.includes('AcadbekGPT orqali qidirilsinmi?')) && (
                      <div className="mt-3 pt-2.5 border-t border-cyan-200 dark:border-cyan-800/80 flex items-center justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            const msgIndex = currentMessages.findIndex(m => m.id === msg.id);
                            const prevUser = currentMessages.slice(0, msgIndex).reverse().find(m => m.role === 'user');
                            const q = prevUser ? prevUser.content : 'AsadbekGPT, savolimga batafsil javob ber';
                            void handleSend(undefined, q, true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-cyan-200 animate-pulse" />
                          <span>{t('Ha, AsadbekGPT orqali qidirish')}</span>
                        </button>
                      </div>
                    )}

                    {/* Document Citations Badge */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                          <FileText className="w-3.5 h-3.5" />
                          <span>{t('Foydalanilgan manbalar va iqtiboslar:')}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.citations.map((c, i) => (
                            <div
                              key={i}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-500/50 transition-all text-[11px] space-y-1.5 group"
                            >
                              <p className="font-semibold text-slate-800 dark:text-slate-300 truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors">
                                {c.sourceType === 'knowledge' ? '📚' : c.sourceType === 'project' ? '📁' : c.sourceType === 'task' ? '✅' : c.sourceType === 'staff' ? '👤' : c.sourceType === 'activity' ? '🕘' : '📄'} {c.documentTitle || c.originalName}
                              </p>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                                <div>{c.sourceType === 'knowledge' ? 'Toifa' : c.sourceType === 'project' ? 'Loyiha' : c.sourceType === 'task' ? 'Vazifa' : c.sourceType === 'staff' ? 'Lavozim' : c.sourceType === 'activity' ? 'Faoliyat' : 'Fayl'}: {c.originalName}</div>
                                {c.sourceType === 'document' && <div>Sahifa/slayd: {c.pageOrSlide ?? 'ko‘rsatilmagan'}</div>}
                                {c.sourceType === 'document' && <div>Holat: {c.verified ? 'tasdiqlangan' : 'tekshirilmagan'}</div>}
                                <div>Manba ID: {c.chunkId}</div>
                              </div>
                              <div className="pt-1 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleOpenCitation(c)}
                                  className="px-2.5 py-1 rounded-lg bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950 dark:hover:bg-cyan-900 border border-cyan-200 dark:border-cyan-800/60 text-cyan-700 dark:text-cyan-300 text-[10px] font-semibold flex items-center gap-1 transition-all"
                                >
                                  <span>{c.sourceType === 'knowledge' ? 'Bilimlar bo‘limi' : c.sourceType === 'project' ? 'Loyihani ochish' : c.sourceType === 'task' ? 'Vazifani ochish' : c.sourceType === 'staff' ? 'Jamoani ko‘rish' : c.sourceType === 'activity' ? 'Faoliyatni ko‘rish' : 'Hujjatni ochish'}</span>
                                  <ExternalLink className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Action Proposal with Confirmation */}
                    {msg.actionProposal && (
                      <div className="mt-3 p-3 rounded-xl bg-cyan-50/70 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-800 dark:text-cyan-300">
                          <Shield className="w-3.5 h-3.5" />
                          <span>{msg.actionProposal.label}</span>
                        </div>
                        <div className="text-[11px] text-slate-800 dark:text-slate-200 bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-sm">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{msg.actionProposal.parameters.title}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800">
                              {msg.actionProposal.parameters.priority || 'Medium'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
                            <div>📁 <span className="font-medium text-slate-700 dark:text-slate-300">{msg.actionProposal.parameters.projectName || 'Laboratoriya loyihasi'}</span></div>
                            <div>👤 <span className="font-medium text-slate-700 dark:text-slate-300">{msg.actionProposal.parameters.assigneeName || 'Mas’ul xodim'}</span></div>
                            <div>📅 <span className="font-medium text-slate-700 dark:text-slate-300">{msg.actionProposal.parameters.deadline || 'Belgilanmagan'}</span></div>
                          </div>
                        </div>

                        {msg.actionProposal.parameters?.created || actionStatus[msg.id]?.startsWith('success') ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded border border-emerald-200 dark:border-emerald-800/40">
                            <Check className="w-4 h-4" />
                            <span>Vazifa muvaffaqiyatli belgilandi va tizimga saqlandi</span>
                          </div>
                        ) : actionStatus[msg.id]?.startsWith('error') ? (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400 p-2 bg-rose-50 dark:bg-rose-950/40 rounded border border-rose-200 dark:border-rose-800/40">
                            <AlertCircle className="w-4 h-4" />
                            <span>{actionStatus[msg.id].replace('error: ', '')}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                            <button
                              disabled={actionStatus[msg.id] === 'executing'}
                              onClick={() => handleExecuteAction(msg.id, msg.actionProposal)}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-200 font-medium text-xs shadow-sm flex items-center gap-1.5 transition-all"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>
                                {actionStatus[msg.id] === 'executing'
                                  ? 'Bajarilmoqda...'
                                  : 'Amalni tasdiqlash va vazifa yaratish'}
                              </span>
                            </button>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400">
                              Xavfsizlik: Har qanday amal auditga yoziladi
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-400 font-mono px-1">
                    {new Date(msg.timestamp).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 p-3 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-xl max-w-sm border border-slate-200 dark:border-slate-800 shadow-xs">
              <RefreshCw className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-spin" />
              <span>Javob tayyorlanmoqda…</span>
            </div>
          )}
        </div>

        {/* Quick Prompts Suggestions bar (when messages are active) */}
        {currentMessages.length > 0 && (
          <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/80 dark:bg-slate-900/30 flex items-center gap-2 overflow-x-auto text-xs no-print flex-shrink-0">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('Fikrlash stsenariylari:')}</span>
            <button
              onClick={() => handleSend(undefined, 'Mikrokontroller datchiklari va firmware kodini jamoada kim qila oladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              👥 {t('Mikrokontroller & firmware kim qila oladi?')}
            </button>
            <button
              onClick={() => handleSend(undefined, '3D korpus konstruktsiyasi va SAPR/CAD chizmalarini jamoada kim qila oladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              📐 {t('3D korpus & chizmalar kim qila oladi?')}
            </button>
            <button
              onClick={() => handleSend(undefined, 'Foydalanuvchi interfeysi (UI/UX) va sensor monitoring grafiklarini jamoada kim qila oladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              💻 {t('Frontend & UI kim qila oladi?')}
            </button>
            <button
              onClick={() => handleSend(undefined, 'Laboratoriyada loyihalar boshqaruvi va muhim qarorlarni kim qabul qiladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              🛡️ {t('Boshqaruv & qarorlar kimda?')}
            </button>
            <button
              onClick={() => handleSend(undefined, 'Agar keramika o‘rniga boshqa datchik qo‘ysak yoki bosim oshsa nima bo‘ladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              🔬 {t('Bosim oshsa nima bo‘ladi?')}
            </button>
            <button
              onClick={() => handleSend(undefined, 'Agar ESP32-S3 Deep Sleep rejimini o‘chirib qo‘ysak nima bo‘ladi?')}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] whitespace-nowrap transition-colors shadow-xs"
            >
              ⚡ {t('Deep Sleep o‘chirilsa nima bo‘ladi?')}
            </button>
          </div>
        )}

        {/* Input Form with Voice STT Microphone Button */}
        <form onSubmit={handleSend} className="p-3 bg-white/95 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 no-print flex-shrink-0">
          {/* Mikrofon tugmasi (Ovozli yozish) */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl border transition-all flex items-center justify-center flex-shrink-0 ${
              isListening
                ? 'bg-rose-600 text-slate-200 border-rose-500 animate-pulse ring-4 ring-rose-400/30 shadow-md'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 hover:bg-slate-200 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700'
            }`}
            title={isListening ? "Tinglanmoqda... (To‘xtatish uchun bosing)" : "Ovoz orqali so‘rash (Mikrofon)"}
          >
            {isListening ? <MicOff className="w-4 h-4 text-slate-200" /> : <Mic className="w-4 h-4" />}
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={isListening ? t("🎙️ Tinglanmoqda... Gapiring...") : t("Yordamchiga savol bering (masalan: 'Mikrokontroller va firmware kodini kim qila oladi?')...")}
            className={`flex-1 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-sans transition-all border ${
              isListening
                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-400 text-slate-900 dark:text-slate-100 placeholder-rose-400'
                : 'bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-slate-200 font-medium text-xs flex items-center gap-1.5 shadow-glow-cyan transition-all flex-shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">{t('Yuborish')}</span>
          </button>
        </form>

        {/* Citation Document Preview Modal */}
        {selectedCitation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="glass-panel-glow rounded-3xl p-6 max-w-xl w-full border border-cyan-500/40 space-y-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/60 flex items-center justify-center text-cyan-700 dark:text-cyan-300 shadow-sm flex-shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200">
                      {selectedCitation.documentTitle || selectedCitation.originalName}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      <span>Fayl: {selectedCitation.originalName}</span>
                      <span>•</span>
                      <span>Sahifa/slayd: {selectedCitation.pageOrSlide ?? 'ko‘rsatilmagan'}</span>
                      <span>•</span>
                      <span>Parcha ID: {selectedCitation.chunkId}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCitation(null)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/90 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-[10px] font-mono tracking-wider text-cyan-700 dark:text-cyan-400 uppercase font-semibold block">
                  Hujjatdan aniq iqtibos parchasi:
                </span>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800/80">
                  «{selectedCitation.snippet}»
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleNavigateToDocument(selectedCitation.documentId)}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-200 font-medium text-xs flex items-center gap-2 shadow-glow-cyan transition-all"
                >
                  <span>Hujjatlar bo‘limida ko‘rish</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCitation(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs transition-colors"
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
