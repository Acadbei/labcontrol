'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Send,
  X,
  Maximize2,
  FileText,
  RefreshCw,
  Cpu,
  Check,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Mic,
  MicOff,
  Volume2,
  VolumeX
} from 'lucide-react';
import { ChatMessage, Citation } from '@/types';
import { MarkdownContent } from '@/components/common/MarkdownContent';
import { PcmAudioStreamPlayer } from '@/lib/tts-client';

export function FloatingAIChat() {
  const { activeTab, setActiveTab, setSelectedDetailItem, triggerDataRefresh, currentUser } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<PcmAudioStreamPlayer | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/chat', { cache: 'no-store' });
      if (res.ok) setMessages(await res.json());
    } catch (e) {
      console.error('Floating chat history fetch error:', e);
    }
  }, []);

  useEffect(() => {
    if (isOpen) void fetchMessages();
  }, [isOpen, fetchMessages]);

  useEffect(() => {
    if (isOpen && messagesScrollRef.current) {
      messagesScrollRef.current.scrollTop = messagesScrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  // Edge-TTS with browser speech fallback
  const speakText = async (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      audioPlayerRef.current?.stop();
      audioPlayerRef.current = null;
      setSpeakingMsgId(null);
      return;
    }

    audioPlayerRef.current?.stop();
    audioPlayerRef.current = null;
    setSpeakingMsgId(msgId);

    const player = new PcmAudioStreamPlayer();
    audioPlayerRef.current = player;
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice: 'uz-UZ-MadinaNeural'
        }),
        signal: player.signal
      });

      await player.play(res, text);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        alert(error instanceof Error ? error.message : 'TTS xizmati javob bermadi.');
      }
    } finally {
      player.stop();
      if (audioPlayerRef.current === player) {
        audioPlayerRef.current = null;
        setSpeakingMsgId(null);
      }
    }
  };

  useEffect(() => () => audioPlayerRef.current?.stop(), []);

  // Speech-to-Text (STT): Listen to voice
  const toggleListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Brauzeringiz ovozli tanib olishni qo‘llab-quvvatlamaydi (Chrome / Edge tavsiya etiladi).');
      return;
    }
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'uz-UZ';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(prev => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleSend = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || isLoading) return;

    setInput('');
    setIsLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: promptToSend.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptToSend.trim(), consent: true })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev.filter(m => m.id !== tempUserMsg.id), data.userMessage, data.assistantMessage]);
        triggerDataRefresh();
      } else {
        const error = await res.json();
        setMessages(prev => prev.filter(message => message.id !== tempUserMsg.id));
        alert(error.error || 'Javob qaytmadi');
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCitation = (c: Citation) => {
    if (c.sourceType === 'knowledge') {
      setActiveTab('knowledge');
      setIsOpen(false);
    } else if (c.sourceType === 'project' && c.sourceId) {
      setSelectedDetailItem({ type: 'project', id: c.sourceId });
      setActiveTab('projects');
      setIsOpen(false);
    } else if (c.sourceType === 'task' && c.sourceId) {
      setSelectedDetailItem({ type: 'task', id: c.sourceId });
      setActiveTab('tasks');
      setIsOpen(false);
    } else if (c.sourceType === 'staff') {
      setActiveTab('team');
      setIsOpen(false);
    } else if (c.sourceType === 'activity') {
      setActiveTab('activity');
      setIsOpen(false);
    } else {
      setSelectedCitation(c);
    }
  };

  const handleNavigateToDocument = (docId?: string) => {
    if (docId) {
      setSelectedDetailItem({ type: 'document', id: docId });
    }
    setActiveTab('documents');
    setIsOpen(false);
    setSelectedCitation(null);
  };

  // Do not render launcher when already on the full Chat tab
  if (activeTab === 'chat') {
    return null;
  }

  return (
    <>
      {/* 1. Persistent Floating Launcher Button */}
      <div className="fixed bottom-2 right-2 sm:bottom-4 sm:right-4 z-50">
        {!isOpen && (
          <div className="group relative flex items-center justify-end select-none">
            {/* "Yordam kerakmi?" Speech Bubble in Skyblue - positioned snug next to persona head */}
            <div
              onClick={() => setIsOpen(true)}
              className="absolute right-[76%] sm:right-[78%] top-6 sm:top-8 flex items-center px-4 py-2.5 rounded-2xl bg-sky-400 text-white font-bold text-xs tracking-wide shadow-xl shadow-sky-400/40 border border-sky-300/90 cursor-pointer opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto transition-all duration-300 ease-out select-none whitespace-nowrap z-20"
              role="tooltip"
            >
              <span>Yordam kerakmi?</span>
              {/* Skyblue arrow pointing right towards persona head */}
              <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-sky-400 border-r border-t border-sky-300/90" />
            </div>

            {/* Persona Mascot Character - without browser native white title tooltip */}
            <button
              onClick={() => setIsOpen(true)}
              className="group/btn relative flex items-center justify-center w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 animate-persona-float focus:outline-none transition-transform duration-300 hover:scale-105 active:scale-95 cursor-pointer bg-transparent border-0 p-0"
              aria-label="LabControl Yordamchi AI"
            >
              <Image
                src="/persona.png"
                alt="AI Persona"
                width={192}
                height={192}
                className="w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)] group-hover/btn:drop-shadow-[0_16px_32px_rgba(6,182,212,0.45)] transition-all duration-300"
                priority
              />
            </button>
          </div>
        )}
      </div>

      {/* 2. Floating AI Chat Window */}
      {isOpen && (
        <div className="fixed bottom-5 right-4 sm:bottom-6 sm:right-6 w-[360px] sm:w-[420px] h-[540px] max-h-[85vh] rounded-3xl glass-panel-glow border border-cyan-500/40 shadow-2xl flex flex-col z-50 overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/40 p-0.5 bg-cyan-950/20 flex-shrink-0 shadow-sm relative">
                <Image
                  src="/persona.png"
                  alt="LabControl Yordamchi"
                  width={40}
                  height={40}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">LabControl Yordamchi</h3>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">OpenRouter · ichki manbalar bilan</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setActiveTab('chat');
                }}
                className="p-1.5 text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="To‘liq sahifada ochish"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Yopish"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Scroll View */}
          <div ref={messagesScrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40 text-xs">
            {messages.length === 0 && (
              <div className="text-center py-8 px-4 space-y-2 text-slate-400">
                <Cpu className="w-8 h-8 mx-auto text-cyan-600 dark:text-cyan-400 opacity-60" />
                <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Assalomu alaykum! Qanday laboratoriya ma’lumotini qidirmoqchisiz?
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Javob faqat tasdiqlangan hujjat parchasidan olinadi. Manba bo‘lmasa, taxmin qilinmaydi.
                </p>
              </div>
            )}

            {messages.map(msg => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 max-w-[90%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                      isUser
                        ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-slate-200 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-cyan-600 dark:text-cyan-400 border border-slate-200 dark:border-cyan-800/40'
                    }`}
                  >
                    {isUser ? (currentUser?.name ? currentUser.name.charAt(0) : 'U') : 'AI'}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div
                      className={`p-3 rounded-2xl leading-relaxed text-xs shadow-xs ${
                        isUser
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 border border-cyan-500/30 text-slate-200 rounded-tr-none'
                          : 'bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                      }`}
                    >
                      {/* Speaker button on assistant message */}
                      {!isUser && (
                        <div className="flex justify-end pb-1 mb-1 border-b border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => speakText(msg.content, msg.id)}
                            className={`p-1 rounded text-[10px] flex items-center gap-1 transition-colors ${
                              speakingMsgId === msg.id
                                ? 'text-rose-600 font-bold'
                                : 'text-slate-400 hover:text-cyan-600'
                            }`}
                            title={speakingMsgId === msg.id ? "Ovozni to‘xtatish" : "Ovozda eshitish"}
                          >
                            {speakingMsgId === msg.id ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                            <span>{speakingMsgId === msg.id ? 'To‘xtatish' : 'Tinglash'}</span>
                          </button>
                        </div>
                      )}

                      <MarkdownContent content={msg.content} />

                      {/* Citations */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                          <span className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 block">
                            Foydalanilgan manbalar:
                          </span>
                          <div className="space-y-1">
                            {msg.citations.map((c, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleOpenCitation(c)}
                                className="w-full text-left p-1.5 rounded-lg bg-slate-50 dark:bg-slate-950/80 hover:bg-slate-100 dark:hover:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[10px] flex items-center justify-between gap-1 group transition-colors"
                              >
                                <span className="truncate text-slate-700 dark:text-slate-300 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                                  {c.sourceType === 'knowledge' ? '📚' : c.sourceType === 'project' ? '📁' : c.sourceType === 'task' ? '✅' : c.sourceType === 'staff' ? '👤' : c.sourceType === 'activity' ? '🕘' : '📄'} {c.documentTitle || c.originalName}
                                </span>
                                <span className="text-cyan-600 dark:text-cyan-400 font-mono text-[9px] flex items-center gap-0.5 flex-shrink-0">
                                  Ochish <ChevronRight className="w-2.5 h-2.5" />
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 p-2.5 text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 max-w-xs shadow-xs">
                <RefreshCw className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 animate-spin" />
                <span>Javob tayyorlanmoqda…</span>
              </div>
            )}
          </div>

          {/* Input Form with Microphone Button */}
          <form onSubmit={handleSend} className="p-2.5 bg-white/95 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2 rounded-xl border transition-all flex items-center justify-center ${
                isListening
                  ? 'bg-rose-600 text-slate-200 border-rose-500 animate-pulse ring-2 ring-rose-400/40'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-cyan-600 border-slate-200 dark:border-slate-700'
              }`}
              title={isListening ? "Tinglanmoqda... (To‘xtatish uchun bosing)" : "Ovoz orqali so‘rash (Mikrofon)"}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 text-slate-200" /> : <Mic className="w-3.5 h-3.5" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
            placeholder={isListening ? 'Tinglanmoqda…' : 'Bilimlar, hujjatlar yoki loyihalar haqida so‘rang'}
              className={`flex-1 px-3 py-2 rounded-xl text-xs transition-all border ${
                isListening
                  ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-400 text-slate-900 dark:text-slate-100 placeholder-rose-400'
                  : 'bg-slate-50 dark:bg-slate-950/80 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-200 shadow-glow-cyan transition-all"
              title="Yuborish"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* 3. Citation Document Preview Modal */}
      {selectedCitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="glass-panel-glow rounded-2xl p-5 max-w-lg w-full border border-cyan-500/40 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-950/80 border border-cyan-300 dark:border-cyan-800/60 flex items-center justify-center text-cyan-700 dark:text-cyan-300">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-200 truncate max-w-xs">
                    {selectedCitation.documentTitle || selectedCitation.originalName}
                  </h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>Fayl: {selectedCitation.originalName}</span>
                    <span>•</span>
                    <span>Sahifa/slayd: {selectedCitation.pageOrSlide ?? 'ko‘rsatilmagan'}</span>
                    <span>•</span>
                    <span>Parcha: {selectedCitation.chunkId}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCitation(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Fikr Snippet Text */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                Fikr / Foydalanilgan Iqtibos:
              </span>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 font-mono leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                {selectedCitation.snippet}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                onClick={() => handleNavigateToDocument(selectedCitation.documentId)}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-200 text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Hujjatlar Bo‘limida Ochish</span>
              </button>

              <button
                onClick={() => setSelectedCitation(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
