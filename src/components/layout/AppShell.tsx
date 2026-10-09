'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { UploadModal } from '@/components/modals/UploadModal';
import { NewTaskModal } from '@/components/modals/NewTaskModal';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { GlobalSearchModal } from '@/components/layout/GlobalSearchModal';
import { FloatingAIChat } from '@/components/layout/FloatingAIChat';
import { LoginView } from '@/components/auth/LoginView';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-tech-grid">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-7 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <UploadModal />
      <NewTaskModal />
      <NewProjectModal />
      <GlobalSearchModal />
      <FloatingAIChat />
    </div>
  );
}
