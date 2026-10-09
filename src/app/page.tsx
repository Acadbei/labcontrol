'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { DashboardView } from '@/components/views/DashboardView';
import { ChatView } from '@/components/views/ChatView';
import { ProjectsView } from '@/components/views/ProjectsView';
import { KnowledgeView } from '@/components/views/KnowledgeView';
import { DocumentsView } from '@/components/views/DocumentsView';
import { TasksView } from '@/components/views/TasksView';
import { TeamView } from '@/components/views/TeamView';
import { ReportsView } from '@/components/views/ReportsView';
import { ActivityView } from '@/components/views/ActivityView';
import { SettingsView } from '@/components/views/SettingsView';

export default function HomePage() {
  const { activeTab } = useApp();

  switch (activeTab) {
    case 'dashboard':
      return <DashboardView />;
    case 'chat':
      return <ChatView />;
    case 'projects':
      return <ProjectsView />;
    case 'knowledge':
      return <KnowledgeView />;
    case 'documents':
      return <DocumentsView />;
    case 'tasks':
      return <TasksView />;
    case 'team':
      return <TeamView />;
    case 'reports':
      return <ReportsView />;
    case 'activity':
      return <ActivityView />;
    case 'settings':
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}
