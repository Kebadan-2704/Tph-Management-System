'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bell, BellOff, BellRing, Check, AlertCircle } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

type NotifStatus = 'idle' | 'subscribing' | 'subscribed' | 'denied' | 'unsupported' | 'error'

export default function NotificationToggle() {
  const { isDarkMode } = useTheme()
  const [status, setStatus] = useState<NotifStatus>('idle')
  const [message, setMessage] = useState('')

  const checkSubscription = useCallback(async () => {
    // Check if push is supported
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      setMessage('Push notifications not supported in this browser')
      return
    }

    // Check permission state
    if (Notification.permission === 'denied') {
      setStatus('denied')
      setMessage('Notifications blocked. Enable in browser settings.')
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        setStatus('subscribed')
        setMessage('You\'ll receive birthday & anniversary alerts')
      } else {
        setStatus('idle')
      }
    } catch {
      setStatus('idle')
    }
  }, [])

  useEffect(() => {
    checkSubscription()
  }, [checkSubscription])

  const subscribe = async () => {
    setStatus('subscribing')
    setMessage('')

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        setMessage('Notification permission was denied')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      
      if (!vapidPublicKey) {
        setStatus('error')
        setMessage('Push configuration missing')
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as any,
      })

      // Send subscription to server
      const res = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      })

      if (res.ok) {
        setStatus('subscribed')
        setMessage('Notifications enabled! You\'ll get daily alerts.')
      } else {
        setStatus('error')
        setMessage('Failed to save subscription. Try again.')
      }
    } catch (err) {
      console.error('Subscribe error:', err)
      setStatus('error')
      setMessage('Something went wrong. Try again.')
    }
  }

  const unsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      
      if (subscription) {
        await subscription.unsubscribe()
        
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
      }

      setStatus('idle')
      setMessage('Notifications disabled')
    } catch (err) {
      console.error('Unsubscribe error:', err)
    }
  }

  const isSubscribed = status === 'subscribed'
  const isDisabled = status === 'unsupported' || status === 'denied' || status === 'subscribing'

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-5 border ${
        isDarkMode 
          ? 'bg-slate-800/50 border-slate-700' 
          : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isSubscribed
            ? 'bg-emerald-500/20 text-emerald-400'
            : status === 'denied'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-violet-500/20 text-violet-400'
        }`}>
          {isSubscribed ? <BellRing className="w-6 h-6" /> 
           : status === 'denied' ? <BellOff className="w-6 h-6" />
           : <Bell className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Push Notifications
          </h3>
          <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {message || 'Get notified about birthdays & anniversaries'}
          </p>
        </div>

        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={isDisabled}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            isSubscribed
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              : isDisabled
                ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-500/20'
          }`}
        >
          {status === 'subscribing' ? (
            <span className="flex items-center gap-1.5">
              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Enabling...
            </span>
          ) : isSubscribed ? (
            <span className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Enabled
            </span>
          ) : status === 'denied' ? (
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Blocked
            </span>
          ) : status === 'unsupported' ? (
            'Not Supported'
          ) : (
            'Enable'
          )}
        </button>
      </div>
    </motion.div>
  )
}
