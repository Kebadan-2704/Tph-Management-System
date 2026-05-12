'use client'

import { ReactNode } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useSidebar } from '@/components/SidebarContext'
import Sidebar from '@/components/Sidebar'

type Props = {
  children: ReactNode;
};

export default function DashboardShell({ children }: Props) {
  const { isDarkMode, themeBg } = useTheme();
  const { isCollapsed } = useSidebar();

  return (
    <div className={`min-h-screen ${themeBg} font-sans transition-colors duration-500 relative overflow-hidden`}>
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-1000 ${isDarkMode ? 'bg-blue-900/10' : 'bg-blue-200/30'} -translate-y-1/2 translate-x-1/3`} />
        <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 ${isDarkMode ? 'bg-purple-900/10' : 'bg-purple-200/30'} translate-y-1/3 -translate-x-1/4`} />
      </div>

      <Sidebar />

      {/* Main Content - offset for sidebar, dynamically adjusts */}
      <main className={`relative z-10 pb-24 lg:pb-8 transition-all duration-300 ${isCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[240px]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}

