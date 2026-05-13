'use client'

import { ReactNode, useState, useCallback } from 'react'
import { AuthProvider, useAuth } from '@/components/AuthProvider'
import { SidebarProvider } from '@/components/SidebarContext'
import { ThemeContext } from '@/hooks/useTheme'
import { useThemeProvider } from '@/hooks/useTheme'
import SplashScreen from '@/components/SplashScreen'

function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useThemeProvider();
  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

function SplashGate({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth()
  const [splashDone, setSplashDone] = useState(false)
  const handleFinish = useCallback(() => setSplashDone(true), [])

  // Show splash while auth is loading OR until splash animation finishes
  const showSplash = isLoading || !splashDone

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleFinish} />}
      <div style={{ visibility: showSplash ? 'hidden' : 'visible' }}>
        {children}
      </div>
    </>
  )
}

export default function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SidebarProvider>
          <SplashGate>
            {children}
          </SplashGate>
        </SidebarProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
