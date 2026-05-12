'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SplashScreenProps {
  onFinish: () => void
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'logo' | 'text' | 'exit'>('logo')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('text'), 800)
    const t2 = setTimeout(() => setPhase('exit'), 2400)
    const t3 = setTimeout(() => onFinish(), 3200)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onFinish])

  return (
    <AnimatePresence>
      {phase !== 'exit' ? null : null}
      <motion.div
        key="splash"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        animate={phase === 'exit' ? { opacity: 0, scale: 1.1 } : { opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 40%, #1e1b4b 70%, #0f172a 100%)' }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 bg-white/20 rounded-full"
              initial={{
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400),
                y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
                scale: Math.random() * 0.5 + 0.5,
              }}
              animate={{
                y: [null, -100],
                opacity: [0, 0.6, 0],
              }}
              transition={{
                duration: Math.random() * 3 + 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: 'linear',
              }}
            />
          ))}
        </div>

        {/* Glowing orbs */}
        <div className="absolute w-80 h-80 bg-violet-600/20 rounded-full blur-[100px] -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-96 h-96 bg-blue-600/15 rounded-full blur-[120px] -bottom-20 -right-20 pointer-events-none" />
        <div className="absolute w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

        {/* Logo */}
        <motion.div
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', damping: 15, stiffness: 100, delay: 0.1 }}
          className="relative z-10 mb-8"
        >
          {/* Glow ring behind logo */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)',
              transform: 'scale(2.5)',
            }}
            animate={{ scale: [2.5, 3, 2.5], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />

          {/* Logo container with border glow */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-2 border-white/20 shadow-2xl shadow-violet-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-full" />
            <img
              src="/looowhite.png"
              alt="Trinity Prayer House"
              className="relative z-10 w-full h-full object-contain p-4"
            />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={phase === 'text' || phase === 'exit' ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 text-center px-6"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-2">
            Trinity Prayer House
          </h1>
          <p className="text-sm sm:text-base font-medium text-violet-300/80 tracking-widest uppercase mb-6">
            Madukkarai
          </p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xs text-slate-500 font-semibold tracking-[0.3em] uppercase"
          >
            Faith • Love • Grace
          </motion.p>
        </motion.div>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute bottom-16 sm:bottom-20 w-48 h-1 bg-white/10 rounded-full overflow-hidden z-10"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 via-blue-500 to-violet-500 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.2 }}
          />
        </motion.div>

        {/* Bottom credit */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-6 sm:bottom-8 text-[10px] text-slate-600 font-medium tracking-wider z-10"
        >
          MANAGEMENT PORTAL
        </motion.p>
      </motion.div>
    </AnimatePresence>
  )
}
