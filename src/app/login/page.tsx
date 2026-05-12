'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Lock, Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'

export default function LoginPage() {
  const router = useRouter();
  const { authRole, isLoading, login } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && authRole) {
      router.replace('/');
    }
  }, [authRole, isLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);



    const { error: loginError } = await login(password);
    if (loginError) {
      setError(loginError);
    } else {
      router.replace('/');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authRole) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-500/30 overflow-hidden relative font-sans">
      {/* Dynamic Abstract Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 100, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30%] left-[50%] w-[40vw] h-[40vw] bg-cyan-600/10 rounded-full blur-[100px] mix-blend-screen"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="bg-slate-900/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-md shadow-2xl border border-white/10 relative z-10 mx-4"
      >
        <div className="flex flex-col items-center justify-center mb-6 sm:mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-slate-950 rounded-2xl sm:rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black mb-4 sm:mb-6 border border-white/5 p-4 relative">
            <div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full" />
            <img src="/looowhite.png" alt="Trinity Logo" className="w-full h-full object-contain relative z-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white text-center tracking-tight mb-2">Trinity Portal</h1>
          <p className="text-slate-400 text-center text-xs sm:text-sm font-medium tracking-wide uppercase">Secure Administrative Access</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">

          <div>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
              <input
                type="password"
                placeholder="Password"
                required
                autoComplete="current-password"
                className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 text-sm font-medium"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-semibold"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </motion.div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 rounded-2xl transition-all shadow-xl shadow-white/10 text-lg flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Sign In'
            )}
          </motion.button>
        </form>

        <p className="text-center text-[11px] text-slate-600 mt-6 font-medium">
          Contact your administrator for access credentials
        </p>
      </motion.div>
    </div>
  );
}
