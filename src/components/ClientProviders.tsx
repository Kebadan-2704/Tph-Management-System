'use client'

import { ReactNode } from 'react'
import { AuthProvider } from '@/components/AuthProvider'
import { SidebarProvider } from '@/components/SidebarContext'
import { ThemeContext } from '@/hooks/useTheme'
import { useThemeProvider } from '@/hooks/useTheme'

function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useThemeProvider();
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          {children}
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
