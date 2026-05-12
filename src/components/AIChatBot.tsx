'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { supabase } from '@/utils/supabase'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// Simple markdown to HTML renderer
function renderMarkdown(text: string): string {
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    // Italic: *text* or _text_
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, '<em>$1</em>')
    // Line breaks
    .replace(/\n/g, '<br/>')
    // Bullet lists: - item
    .replace(/<br\/>\s*-\s+/g, '<br/>• ')
}

export default function AIChatBot() {
  const { isDarkMode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Praise the Lord! 🙏 I\'m the **TPH AI Assistant**. I can help you with:\n\n- Church data — members, families, finances\n- Bible verses & prayer guidance\n- General questions & anything else!\n\nHow can I help you today?',
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [siteContext, setSiteContext] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Build live context from Supabase
  const buildSiteContext = useCallback(async () => {
    try {
      const [
        { count: familyCount },
        { count: memberCount },
        { count: txCount },
        { data: families },
        { data: members },
        { data: transactions }
      ] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('families').select('id, membership_id, head_name, mobile, address, place'),
        supabase.from('members').select('id, name, relationship, gender, birth_date, marriage_date, baptism_date, family_id, families(head_name)'),
        supabase.from('transactions').select('amount, purpose, payment_date, families(head_name)').order('payment_date', { ascending: false }).limit(100)
      ])

      const now = new Date()
      const currentMonth = now.getMonth()

      // Upcoming birthdays this month
      const birthdaysThisMonth = (members || [])
        .filter(m => {
          if (!m.birth_date) return false
          const parts = m.birth_date.split(/[-./]/)
          const d = new Date(parts.join('-'))
          return d.getMonth() === currentMonth
        })
        .map(m => `${m.name} (DOB: ${m.birth_date}, Family: ${(m.families as any)?.head_name || 'N/A'})`)

      // Upcoming anniversaries this month
      const anniversariesThisMonth = (members || [])
        .filter(m => {
          if (!m.marriage_date) return false
          const parts = m.marriage_date.split(/[-./]/)
          const d = new Date(parts.join('-'))
          return d.getMonth() === currentMonth
        })
        .map(m => `${m.name} (Date: ${m.marriage_date}, Family: ${(m.families as any)?.head_name || 'N/A'})`)

      // Financial summary
      const financialSummary: Record<string, number> = {}
      let totalCollection = 0
      ;(transactions || []).forEach(tx => {
        financialSummary[tx.purpose] = (financialSummary[tx.purpose] || 0) + Number(tx.amount)
        totalCollection += Number(tx.amount)
      })
      const financeLines = Object.entries(financialSummary)
        .sort((a, b) => b[1] - a[1])
        .map(([purpose, amount]) => `${purpose}: ₹${amount.toLocaleString()}`)

      // Family list (first 50)
      const familyLines = (families || []).slice(0, 50).map(f =>
        `ID: ${f.membership_id || 'N/A'}, Head: ${f.head_name}, Mobile: ${f.mobile || 'N/A'}, Place: ${f.place || 'N/A'}`
      )

      // Gender breakdown
      const maleCount = (members || []).filter(m => m.gender === 'Male').length
      const femaleCount = (members || []).filter(m => m.gender === 'Female').length

      // Baptism info
      const baptizedCount = (members || []).filter(m => m.baptism_date).length

      const context = `
You are the TPH AI Assistant for Trinity Prayer House Madukkarai's admin portal.
You have TWO roles:
1. PRIMARY: Answer questions about the church's live database (members, families, finances, events). Use the data provided below.
2. SECONDARY: You can also answer general questions — Bible verses, prayer guidance, spiritual encouragement, coding help, or anything else the user asks.

When answering about church data, use ONLY the data below. For general questions, use your own knowledge.
Do NOT use markdown bold (**text**). Instead, just write plain text clearly.
Today's date: ${now.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

=== LIVE DATABASE STATS ===
Total Families: ${familyCount || 0}
Total Members: ${memberCount || 0}
Total Transactions: ${txCount || 0}
Male Members: ${maleCount}
Female Members: ${femaleCount}
Baptized Members: ${baptizedCount}
Total Financial Collection (recent 100 receipts): ₹${totalCollection.toLocaleString()}

=== FINANCIAL BREAKDOWN ===
${financeLines.join('\n') || 'No transaction data available.'}

=== BIRTHDAYS THIS MONTH ===
${birthdaysThisMonth.length > 0 ? birthdaysThisMonth.join('\n') : 'No birthdays this month.'}

=== WEDDING ANNIVERSARIES THIS MONTH ===
${anniversariesThisMonth.length > 0 ? anniversariesThisMonth.join('\n') : 'No anniversaries this month.'}

=== FAMILY DIRECTORY (first 50) ===
${familyLines.join('\n') || 'No families found.'}

=== INSTRUCTIONS ===
- For church data questions: use ONLY the data above. Do not invent data.
- For general questions: answer freely and helpfully.
- Be warm, concise, and spiritually encouraging.
- Use ₹ for currency.
- If church data is not available for a specific query, say "I don't have that detail in my current data. Please check the dashboard directly."
`
      setSiteContext(context)
    } catch (err) {
      console.error('Failed to build AI context:', err)
      setSiteContext('You are the TPH AI Assistant. You can answer general questions. The church database is temporarily unavailable for data queries.')
    }
  }, [])

  useEffect(() => {
    buildSiteContext()
  }, [buildSiteContext])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      // Refresh context each time the chat is opened
      buildSiteContext()
    }
  }, [isOpen, buildSiteContext])

  const sendMessage = async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: trimmed,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      // Build conversation history for context (last 6 messages)
      const recentHistory = messages.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n')

      const fullPrompt = `${siteContext}\n\n=== CONVERSATION HISTORY ===\n${recentHistory}\n\nUser: ${trimmed}\n\nAssistant:`
      const res = await fetch(`https://chatbot.codexapi.workers.dev/?prompt=${encodeURIComponent(fullPrompt)}&model=gpt-5.1`)
      const data = await res.json()

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer || 'I\'m sorry, I couldn\'t process that right now. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, botMsg])
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again in a moment. 🙏',
        timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 text-white shadow-2xl shadow-purple-500/40 flex items-center justify-center group"
          >
            <Sparkles className="w-7 h-7 group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[60] w-full sm:w-[380px] sm:max-w-[calc(100vw-2rem)] h-full sm:h-[560px] sm:max-h-[calc(100vh-4rem)] flex flex-col sm:rounded-3xl overflow-hidden shadow-2xl shadow-black/30"
            style={{ backdropFilter: 'blur(20px)' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 px-5 py-4 flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-bold text-sm leading-tight">TPH AI Assistant</h3>
                <p className="text-purple-200 text-[11px] font-medium">Church data + General AI</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}
              style={{ scrollbarWidth: 'thin' }}
            >
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white'
                  }`}>
                    {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed chat-msg ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-md'
                        : isDarkMode
                          ? 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-md'
                          : 'bg-white text-slate-800 border border-slate-200 shadow-sm rounded-tl-md'
                    }`}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </motion.div>
              ))}

              {/* Typing Indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                  <div className={`rounded-2xl rounded-tl-md px-4 py-3 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200 shadow-sm'}`}>
                    <div className="flex gap-1.5 items-center">
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`} style={{ animationDelay: '0ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`} style={{ animationDelay: '150ms' }}></div>
                      <div className={`w-2 h-2 rounded-full animate-bounce ${isDarkMode ? 'bg-purple-400' : 'bg-purple-500'}`} style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className={`px-4 py-2 flex flex-wrap gap-2 border-t ${isDarkMode ? 'bg-slate-900/50 border-slate-800' : 'bg-white/50 border-slate-100'}`}>
                {['How many families?', 'Birthdays this month?', 'Financial summary', 'Give me a prayer'].map(q => (
                  <button
                    key={q}
                    onClick={() => { setInput(q); setTimeout(() => { setInput(q); inputRef.current?.focus() }, 50) }}
                    className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-all ${
                      isDarkMode
                        ? 'bg-slate-800 border-slate-700 text-purple-300 hover:bg-purple-900/30 hover:border-purple-700'
                        : 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* Input Area */}
            <div className={`px-4 py-3 border-t shrink-0 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className={`flex items-center gap-2 rounded-2xl px-4 py-2 ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-slate-100 border border-slate-200'}`}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className={`flex-1 bg-transparent outline-none text-sm font-medium ${isDarkMode ? 'text-white placeholder-slate-500' : 'text-slate-800 placeholder-slate-400'}`}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                    input.trim() && !isLoading
                      ? 'bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50'
                      : isDarkMode ? 'bg-slate-700 text-slate-500' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              <p className={`text-[10px] text-center mt-2 font-medium ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`}>
                TPH data + General AI • Powered by GPT
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
