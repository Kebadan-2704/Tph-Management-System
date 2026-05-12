'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, BarChart3, LogOut, Sun, Moon, Menu, X, ChevronLeft } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/components/AuthProvider'
import { useSidebar } from '@/components/SidebarContext'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/directory', label: 'Directory', icon: Users },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isDarkMode, toggleTheme } = useTheme();
  const { logout, authRole, userEmail } = useAuth();
  const { isCollapsed, setIsCollapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center gap-3 px-5 pt-7 pb-6 ${isCollapsed ? 'justify-center px-3' : ''}`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg p-1.5 border shrink-0 ${
          isDarkMode ? 'bg-slate-900 shadow-slate-900/30 border-white/10' : 'bg-white shadow-slate-200/50 border-slate-100'
        }`}>
          <img src={isDarkMode ? "/looowhite.png" : "/loooBlack.png"} alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
            <h1 className={`text-base font-extrabold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Trinity Portal</h1>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${
              isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
            }`}>
              {authRole}
            </span>
          </motion.div>
        )}
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 space-y-1 relative">
        {NAV_ITEMS.map((item) => {
          
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group relative ${
                isActive
                  ? isDarkMode
                    ? 'text-blue-400'
                    : 'text-blue-600'
                  : isDarkMode
                    ? 'text-slate-400 hover:text-white hover:bg-white/5'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
              } ${isCollapsed ? 'justify-center px-3' : ''}`}
            >
              {isActive && (
                <motion.div
                  layoutId="desktopNav"
                  className={`absolute inset-0 rounded-xl ${isDarkMode ? 'bg-blue-500/15 shadow-lg shadow-blue-500/5' : 'bg-blue-500/10 shadow-lg shadow-blue-500/5'}`}
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={`w-5 h-5 shrink-0 relative z-10 ${isActive ? '' : 'group-hover:scale-110'} transition-transform`} />
              {!isCollapsed && <span className="relative z-10">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`px-3 pb-5 space-y-1 border-t pt-3 ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
        {userEmail && !isCollapsed && (
          <p className={`px-4 py-2 text-[11px] font-medium truncate ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            {userEmail}
          </p>
        )}
        <button
          onClick={toggleTheme}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all w-full ${
            isDarkMode
              ? 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/5'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
          } ${isCollapsed ? 'justify-center px-3' : ''}`}
        >
          {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
          {!isCollapsed && <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button
          onClick={async () => { await logout(); router.replace('/login'); }}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all w-full ${
            isDarkMode
              ? 'text-red-400 hover:bg-red-500/10'
              : 'text-red-500 hover:bg-red-50'
          } ${isCollapsed ? 'justify-center px-3' : ''}`}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Log Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col fixed left-0 top-0 h-screen z-30 border-r transition-all duration-300 ${
        isDarkMode ? 'bg-slate-950/80 border-white/5 backdrop-blur-xl' : 'bg-white/80 border-slate-200/80 backdrop-blur-xl'
      } ${isCollapsed ? 'w-[72px]' : 'w-[240px]'}`}>
        {sidebarContent}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`absolute -right-3 top-20 w-6 h-6 rounded-full border flex items-center justify-center shadow-sm z-50 transition-all ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-slate-900'
          }`}
        >
          <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
        </button>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t ${
        isDarkMode ? 'bg-slate-950/90 border-white/5 backdrop-blur-xl' : 'bg-white/90 border-slate-200 backdrop-blur-xl'
      } safe-area-bottom`}>
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${
                  isActive
                    ? isDarkMode
                      ? 'text-blue-400'
                      : 'text-blue-600'
                    : isDarkMode
                      ? 'text-slate-500'
                      : 'text-slate-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
                <span className="text-[10px] font-bold">{item.label}</span>
                {isActive && (
                  <motion.div layoutId="mobileNav" className="absolute bottom-0 w-8 h-1 bg-blue-500 rounded-full" />
                )}
              </Link>
            );
          })}
          <button
            onClick={() => setMobileOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>
      </nav>

      {/* Mobile More Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl p-6 border-t ${
                isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-extrabold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Menu</h3>
                <button onClick={() => setMobileOpen(false)} className="p-2 rounded-full hover:bg-slate-500/10">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {userEmail && (
                <p className={`text-xs font-medium mb-4 px-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>{userEmail}</p>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => { toggleTheme(); setMobileOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all w-full ${
                    isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5" />}
                  {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                </button>
                <button
                  onClick={async () => { await logout(); setMobileOpen(false); router.replace('/login'); }}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all w-full ${
                    isDarkMode ? 'text-red-400 hover:bg-red-500/10' : 'text-red-500 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="w-5 h-5" />
                  Log Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
