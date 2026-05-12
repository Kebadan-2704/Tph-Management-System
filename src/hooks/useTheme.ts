'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  // Computed class strings for convenience
  themeBg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  inputBg: string;
  borderColor: string;
};

const defaultValue: ThemeContextType = {
  isDarkMode: false,
  toggleTheme: () => {},
  themeBg: 'bg-[#f4f7fb] text-slate-800',
  cardBg: 'bg-white/80 backdrop-blur-2xl border-white/60 shadow-xl shadow-slate-200/50',
  textPrimary: 'text-slate-900',
  textSecondary: 'text-slate-500',
  inputBg: 'bg-slate-50 border-slate-200',
  borderColor: 'border-slate-200',
};

export const ThemeContext = createContext<ThemeContextType>(defaultValue);

export function useTheme() {
  return useContext(ThemeContext);
}

export function useThemeProvider() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('tph-theme');
    if (stored === 'dark') setIsDarkMode(true);
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('tph-theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  const themeBg = isDarkMode ? 'bg-[#0a0f1c] text-slate-100' : 'bg-[#fcfdfd] text-slate-900';
  const cardBg = isDarkMode
    ? 'bg-slate-900/50 backdrop-blur-2xl border-white/5 shadow-2xl shadow-black/40'
    : 'bg-white/90 backdrop-blur-2xl border-slate-200/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]';
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900';
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200';
  const borderColor = isDarkMode ? 'border-slate-800' : 'border-slate-200';

  return {
    isDarkMode,
    toggleTheme,
    themeBg,
    cardBg,
    textPrimary,
    textSecondary,
    inputBg,
    borderColor,
  };
}
