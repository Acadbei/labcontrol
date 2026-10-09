import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { AppProvider } from '@/context/AppContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { UploadModal } from '@/components/modals/UploadModal';
import { NewTaskModal } from '@/components/modals/NewTaskModal';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { GlobalSearchModal } from '@/components/layout/GlobalSearchModal';

import { AppShell } from '@/components/layout/AppShell';

export const metadata: Metadata = {
  title: 'LabControl — Laboratoriyaning ikkinchi miyasi',
  description:
    'Ishlab chiqarish laboratoriyasi uchun markaziy boshqaruv va Second Brain tizimi: texnik hujjatlar (PDF, DOCX, PPTX), 3D chizmalar, mikrokontroller loyihalari, vazifalar va lokal AI Yordamchi.',
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {`
            (function() {
              try {
                var theme = localStorage.getItem('lab_control_theme');
                if (theme === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else if (theme === 'dark') {
                  document.documentElement.classList.remove('light');
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch(e) {}
            })();
          `}
        </Script>
      </head>
      <body className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] flex flex-col antialiased selection:bg-cyan-500 selection:text-black">
        <AppProvider>
          <AppShell>{children}</AppShell>
        </AppProvider>
      </body>
    </html>
  );
}
