'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User } from '@/types';
import { canOpenTab } from '@/lib/policy';
import { latinToCyrillic, cyrillicToLatin } from '@/lib/transliterate';

export type NavTab = 'dashboard' | 'chat' | 'projects' | 'knowledge' | 'documents' | 'tasks' | 'team' | 'reports' | 'activity' | 'settings';
export type ThemeMode = 'dark' | 'light';
export type ScriptMode = 'latin' | 'cyrillic';

export interface DetailNavigationItem {
  type: 'project' | 'document' | 'task' | 'knowledge';
  id: string;
}

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  refreshUser: () => Promise<void>;
  globalSearch: string;
  setGlobalSearch: (q: string) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  isNewTaskModalOpen: boolean;
  setIsNewTaskModalOpen: (open: boolean) => void;
  isNewProjectModalOpen: boolean;
  setIsNewProjectModalOpen: (open: boolean) => void;
  theme: ThemeMode;
  setTheme: (t: ThemeMode) => void;
  toggleTheme: () => void;
  scriptMode: ScriptMode;
  setScriptMode: (m: ScriptMode) => void;
  toggleScriptMode: () => void;
  t: (text: string) => string;
  toLatin: (text: string) => string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  selectedDetailItem: DetailNavigationItem | null;
  setSelectedDetailItem: (item: DetailNavigationItem | null) => void;
  dataVersion: number;
  triggerDataRefresh: () => void;
  isAuthenticated: boolean;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;
  isDemoMode: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function applyThemeClass(theme: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('light', theme === 'light');
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [activeTab, setActiveTabState] = useState<NavTab>('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const [scriptMode, setScriptModeState] = useState<ScriptMode>('latin');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<DetailNavigationItem | null>(null);
  const [dataVersion, setDataVersion] = useState(1);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/session', {
        cache: 'no-store',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) {
        setCurrentUser(null);
        setAllUsers([]);
        setIsAuthenticated(false);
        setIsDemoMode(false);
        return;
      }
      const data = await response.json();
      setCurrentUser(data.user ?? null);
      setAllUsers(Array.isArray(data.team) ? data.team : []);
      setIsAuthenticated(Boolean(data.user));
      setIsDemoMode(data.demoMode === true);
    } catch {
      setCurrentUser(null);
      setAllUsers([]);
      setIsAuthenticated(false);
      setIsDemoMode(false);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('lab_control_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setThemeState(savedTheme);
        applyThemeClass(savedTheme);
      } else applyThemeClass('light');
    } catch { applyThemeClass('light'); }

    try {
      const savedScript = localStorage.getItem('lab_control_script');
      if (savedScript === 'latin' || savedScript === 'cyrillic') {
        setScriptModeState(savedScript);
      }
    } catch { /* optional */ }
  }, []);

  const setScriptMode = (m: ScriptMode) => {
    setScriptModeState(m);
    try { localStorage.setItem('lab_control_script', m); } catch { /* optional */ }
  };

  const toggleScriptMode = () => {
    setScriptMode(scriptMode === 'latin' ? 'cyrillic' : 'latin');
  };

  const t = useCallback((text: string): string => {
    if (!text || scriptMode === 'latin') return text;
    return latinToCyrillic(text);
  }, [scriptMode]);

  const toLatin = useCallback((text: string): string => {
    if (!text) return text;
    return cyrillicToLatin(text);
  }, []);

  const login = async (identifier: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }), cache: 'no-store'
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Tizimga kirib bo‘lmadi');
    setCurrentUser(result.user);
    setIsAuthenticated(true);
    setAuthReady(true);
    await fetchSession();
    setDataVersion(version => version + 1);
  };

  const logout = async () => {
    try { await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' }); }
    finally {
      setCurrentUser(null);
      setAllUsers([]);
      setIsAuthenticated(false);
      setIsDemoMode(false);
      setActiveTabState('dashboard');
    }
  };

  const setTheme = (nextTheme: ThemeMode) => {
    setThemeState(nextTheme);
    applyThemeClass(nextTheme);
    try { localStorage.setItem('lab_control_theme', nextTheme); } catch { /* Theme persistence is optional. */ }
  };
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const setActiveTab = (tab: NavTab) => {
    if (!canOpenTab(currentUser, tab)) return;
    setActiveTabState(tab);
    setIsMobileMenuOpen(false);
  };
  const triggerDataRefresh = useCallback(() => setDataVersion(version => version + 1), []);

  return (
    <AppContext.Provider value={{
      currentUser, allUsers, activeTab, setActiveTab, refreshUser: fetchSession,
      globalSearch, setGlobalSearch, isUploadModalOpen, setIsUploadModalOpen,
      isNewTaskModalOpen, setIsNewTaskModalOpen, isNewProjectModalOpen, setIsNewProjectModalOpen,
      theme, setTheme, toggleTheme, scriptMode, setScriptMode, toggleScriptMode, t, toLatin,
      isMobileMenuOpen, setIsMobileMenuOpen,
      isGlobalSearchOpen, setIsGlobalSearchOpen, selectedDetailItem, setSelectedDetailItem,
      dataVersion, triggerDataRefresh, isAuthenticated, authReady, setAuthReady, isDemoMode, login, logout
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

export const useAppContext = useApp;
