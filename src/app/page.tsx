'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, User, MapPin, Phone, Mail, Calendar, Users, FileText, CheckCircle2, Plus, Printer, TrendingUp, MessageCircle, X, Gift, Lock, ShieldCheck, Megaphone, PieChart as PieChartIcon, Moon, Sun, Download, Edit3, UserPlus, LogOut, Trash2, ChevronRight } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'

type Family = { id: string; membership_id: string; head_name: string; address: string; place: string; mobile: string; email: string; join_date: string }
type Member = { id: string; family_id: string; name: string; relationship: string; gender: string; birth_date: string; baptism_date: string; marriage_date: string }
type Transaction = { id: string; receipt_number: string; amount: number; purpose: string; payment_date: string }

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

// Animation Variants
const staggerContainer = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } }
const scaleIn = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } } }

export default function Home() {
  const [authRole, setAuthRole] = useState<'admin' | 'volunteer' | null>(null)
  const [passcode, setPasscode] = useState(''); const [authError, setAuthError] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Family[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  const [stats, setStats] = useState({ families: 0, members: 0, txCount: 0 })
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<(Member & { families?: any })[]>([])
  const [chartData, setChartData] = useState<{name: string, value: number}[]>([])

  const [amount, setAmount] = useState(''); const [purpose, setPurpose] = useState('Tithes')
  const [isSaving, setIsSaving] = useState(false); const [successMsg, setSuccessMsg] = useState('')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false); const [broadcastMsg, setBroadcastMsg] = useState('')
  const [showEditFamModal, setShowEditFamModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showEditDependentModal, setShowEditDependentModal] = useState(false)
  const [editDependent, setEditDependent] = useState<Member | null>(null)
  
  const [newFam, setNewFam] = useState({ head_name: '', mobile: '', address: '', place: '', email: '', gender: '', birth_date: '', baptism_date: '', marriage_date: '' })
  const [editFam, setEditFam] = useState({ head_name: '', mobile: '', address: '' })
  const [newMember, setNewMember] = useState({ name: '', relationship: '', birth_date: '', marriage_date: '', gender: '' })
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (!authRole) return;
    async function loadDashboard() {
      const [{ count: fCount }, { count: mCount }, { count: txCount }, { data: allTx }, { data: allMembers }] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('amount, purpose'),
        supabase.from('members').select('*, families(head_name, mobile)')
      ])
      setStats({ families: fCount || 0, members: mCount || 0, txCount: txCount || 0 })
      if (allTx) {
        const grouped = allTx.reduce((acc: any, tx) => { acc[tx.purpose] = (acc[tx.purpose] || 0) + Number(tx.amount); return acc; }, {});
        setChartData(Object.keys(grouped).map(k => ({ name: k, value: grouped[k] })))
      }
      const currentMonth = new Date().toLocaleString('default', { month: 'short' })
      if (allMembers) {
        const bdays = allMembers.filter(m => m.birth_date && m.birth_date.includes(currentMonth))
        setUpcomingBirthdays(bdays.slice(0, 5))
      }
    }
    loadDashboard()
  }, [authRole])

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        let searchId = searchTerm.trim()
        if (/^\d+$/.test(searchId)) searchId = `TPH-MDK-${searchId.padStart(5, '0')}`
        
        const { data: mData } = await supabase.from('members').select('family_id').ilike('name', `%${searchTerm}%`).limit(20)
        const familyIds = mData ? mData.map(m => m.family_id) : []
        
        let query = supabase.from('families').select('*')
        if (familyIds.length > 0) {
            query = query.or(`membership_id.ilike.%${searchId}%,head_name.ilike.%${searchTerm}%,id.in.(${familyIds.join(',')})`)
        } else {
            query = query.or(`membership_id.ilike.%${searchId}%,head_name.ilike.%${searchTerm}%`)
        }
        
        const { data } = await query.limit(8)
        setSuggestions(data || []); setShowSuggestions(true)
      } else { setSuggestions([]); setShowSuggestions(false) }
    }, 300)
    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm])

  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); if (passcode === 'admin123') setAuthRole('admin'); else if (passcode === 'tph123') setAuthRole('volunteer'); else setAuthError('Invalid Access Code') }

  const selectFamily = async (selectedFamily: Family) => {
    setSearchTerm(''); setShowSuggestions(false); setLoading(true); setFamily(selectedFamily); setSuccessMsg('')
    try {
      const [{ data: mData }, { data: txData }] = await Promise.all([
        supabase.from('members').select('*').eq('family_id', selectedFamily.id),
        supabase.from('transactions').select('*').eq('family_id', selectedFamily.id).order('payment_date', { ascending: false })
      ])
      setMembers(mData || []); setTransactions(txData || [])
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  const exportBackup = async () => {
    const { data: allFams } = await supabase.from('families').select('*')
    if (!allFams) return alert("Failed to fetch backup")
    const csvContent = "data:text/csv;charset=utf-8," + "ID,Head Name,Mobile,Address,Place\n" + allFams.map(f => `${f.membership_id},"${f.head_name}",${f.mobile},"${f.address}","${f.place}"`).join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `tph_backup_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault(); if (!family || !amount || isNaN(Number(amount))) return; setIsSaving(true)
    const receiptNumber = `REC-${Date.now()}`
    try {
      const { data: newTx, error } = await supabase.from('transactions').insert({ family_id: family.id, receipt_number: receiptNumber, amount: Number(amount), purpose, payment_date: new Date().toISOString() }).select().single()
      if (error) throw error
      setTransactions([newTx, ...transactions]); setStats(prev => ({ ...prev, txCount: prev.txCount + 1 })); setAmount(''); setPurpose('Tithes')
      setSuccessMsg('Receipt saved successfully!'); setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) { alert('Failed to save receipt.') } finally { setIsSaving(false) }
  }

  const handleAddFamily = async (e: React.FormEvent) => {
    e.preventDefault(); setIsWorking(true)
    try {
      const newMembershipId = `TPH-MDK-${String(stats.families + 1).padStart(5, '0')}`
      const { data: fData, error: fError } = await supabase.from('families').insert({ membership_id: newMembershipId, head_name: newFam.head_name, mobile: newFam.mobile, address: newFam.address, place: newFam.place, email: newFam.email }).select().single()
      if (fError) throw fError
      await supabase.from('members').insert({ family_id: fData.id, name: newFam.head_name, relationship: 'Head', gender: newFam.gender, birth_date: newFam.birth_date, baptism_date: newFam.baptism_date, marriage_date: newFam.marriage_date })
      setStats(prev => ({ ...prev, families: prev.families + 1, members: prev.members + 1 })); setShowAddModal(false); setNewFam({ head_name: '', mobile: '', address: '', place: '', email: '', gender: '', birth_date: '', baptism_date: '', marriage_date: '' })
      selectFamily(fData)
    } catch(err) { alert("Error adding family.") } finally { setIsWorking(false) }
  }

  const handleEditFamily = async (e: React.FormEvent) => {
    e.preventDefault(); setIsWorking(true)
    try {
      const { data: updatedFam, error } = await supabase.from('families').update({ head_name: editFam.head_name, mobile: editFam.mobile, address: editFam.address }).eq('id', family?.id).select().single()
      if (error) throw error
      setFamily(updatedFam); setShowEditFamModal(false)
    } catch(err) { alert("Error updating family.") } finally { setIsWorking(false) }
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault(); setIsWorking(true)
    try {
      const { data: mData, error } = await supabase.from('members').insert({ family_id: family?.id, name: newMember.name, relationship: newMember.relationship, gender: newMember.gender, birth_date: newMember.birth_date, marriage_date: newMember.marriage_date }).select().single()
      if (error) throw error
      setMembers([...members, mData]); setShowAddMemberModal(false); setNewMember({ name: '', relationship: '', birth_date: '', marriage_date: '', gender: '' })
    } catch(err) { alert("Error adding member.") } finally { setIsWorking(false) }
  }

  const handleEditDependent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editDependent) return; setIsWorking(true)
    try {
      const { data, error } = await supabase.from('members').update({ name: editDependent.name, relationship: editDependent.relationship, gender: editDependent.gender, birth_date: editDependent.birth_date, marriage_date: editDependent.marriage_date }).eq('id', editDependent.id).select().single()
      if (error) throw error
      setMembers(members.map(m => m.id === data.id ? data : m)); setShowEditDependentModal(false)
    } catch(err) { alert("Error updating member.") } finally { setIsWorking(false) }
  }

  const handleBroadcast = () => { if(!broadcastMsg) return; alert(`Broadcast sent to ${stats.families} families successfully!`); setShowBroadcastModal(false); setBroadcastMsg('') }
  const handleDeleteReceipt = async (txId: string) => { if (!confirm("Delete this receipt permanently?")) return; try { await supabase.from('transactions').delete().eq('id', txId); setTransactions(transactions.filter(t => t.id !== txId)); setStats(prev => ({ ...prev, txCount: Math.max(0, prev.txCount - 1) })) } catch(err) { alert("Failed to delete.") } }
  const printReceipt = (tx: Transaction) => { const printWindow = window.open('', '_blank'); if (!printWindow) return; printWindow.document.write(`<html><head><title>Receipt ${tx.receipt_number}</title><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet"><style>body { font-family: 'Plus Jakarta Sans', sans-serif; padding: 40px; color: #1e293b; background: #f8fafc; margin: 0; display: flex; justify-content: center; -webkit-print-color-adjust: exact; print-color-adjust: exact; } .receipt-container { width: 100%; max-width: 600px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 32px; padding: 48px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.1); position: relative; overflow: hidden; } .header { text-align: center; border-bottom: 2px dashed #cbd5e1; padding-bottom: 30px; margin-bottom: 30px; } .logo { width: 90px; height: 90px; object-fit: contain; margin-bottom: 16px; } .title { font-size: 26px; font-weight: 800; color: #0f172a; margin: 0; letter-spacing: -0.5px; } .subtitle { font-size: 15px; color: #64748b; font-weight: 600; margin-top: 6px; } .details { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; } .detail-box { background: #f8fafc; padding: 16px; border-radius: 16px; } .detail-label { font-size: 11px; text-transform: uppercase; font-weight: 800; color: #94a3b8; letter-spacing: 1px; margin-bottom: 6px; } .detail-value { font-size: 16px; font-weight: 700; color: #334155; } .amount-container { text-align: center; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: white; padding: 32px; border-radius: 24px; margin-bottom: 30px; } .amount-label { font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #94a3b8; font-weight: 700; margin-bottom: 12px; } .amount-value { font-size: 48px; font-weight: 800; margin: 0; color: #fff; letter-spacing: -1px; } .footer { text-align: center; font-size: 14px; color: #94a3b8; font-weight: 600; border-top: 1px solid #e2e8f0; padding-top: 24px; } @media print { body { background: white; padding: 0; } .receipt-container { box-shadow: none; border: none; padding: 20px; max-width: 100%; } }</style></head><body><div class="receipt-container"><div class="header"><img src="${window.location.origin}/loooBlack.png" class="logo" alt="Logo"/><h1 class="title">TRINITY PRAYER HOUSE</h1><p class="subtitle">Madukkarai, Coimbatore</p></div><div class="details"><div class="detail-box"><div class="detail-label">Receipt Number</div><div class="detail-value">${tx.receipt_number}</div></div><div class="detail-box"><div class="detail-label">Payment Date</div><div class="detail-value">${new Date(tx.payment_date).toLocaleDateString('en-IN')}</div></div><div class="detail-box" style="grid-column: span 2;"><div class="detail-label">Received From</div><div class="detail-value">${family?.head_name} (${family?.membership_id})</div></div><div class="detail-box" style="grid-column: span 2;"><div class="detail-label">Purpose of Contribution</div><div class="detail-value">${tx.purpose}</div></div></div><div class="amount-container"><div class="amount-label">Amount Received</div><div class="amount-value">₹${tx.amount.toLocaleString('en-IN')}</div></div><div class="footer">Thank you for your generous contribution.<br>May God bless you abundantly!</div></div><script>setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 500);</script></body></html>`); printWindow.document.close() }
  const sendWhatsApp = (tx: Transaction) => { if (!family?.mobile) return alert("No mobile number registered."); let phone = family.mobile.replace(/\D/g,''); if (phone.length === 10) phone = `91${phone}`; window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`*Trinity Prayer House*\n\nDear ${family.head_name},\nWe have safely received your contribution of *₹${tx.amount.toLocaleString('en-IN')}* towards ${tx.purpose}.\n\nReceipt No: ${tx.receipt_number}\nDate: ${new Date(tx.payment_date).toLocaleDateString('en-IN')}\n\nMay God bless you abundantly!`)}`, '_blank') }

  // ----------------------------------------------------
  // --- LOGIN SCREEN (SAAS REDESIGN)
  // ----------------------------------------------------
  if (!authRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 selection:bg-blue-500/30 overflow-hidden relative font-sans">
        {/* Dynamic Abstract Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 100, repeat: Infinity, ease: "linear" }} className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen"></motion.div>
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 120, repeat: Infinity, ease: "linear" }} className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] bg-purple-600/20 rounded-full blur-[100px] mix-blend-screen"></motion.div>
        </div>

        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="bg-slate-900/60 backdrop-blur-3xl rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl border border-white/10 relative z-10">
          <div className="flex flex-col items-center justify-center mb-8">
            <div className="w-24 h-24 bg-slate-950 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-black mb-6 border border-white/5 p-4 relative">
              <div className="absolute inset-0 bg-yellow-500/10 blur-xl rounded-full"></div>
              <img src="/looowhite.png" alt="Trinity Logo" className="w-full h-full object-contain relative z-10" />
            </div>
            <img src="/golden_text.png" alt="Trinity Prayer House" className="h-14 object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]" />
            <p className="text-slate-400 text-center text-sm font-medium mt-2 tracking-wide uppercase">Secure Administrative Access</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                <input type="password" placeholder="Enter Access Code" required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 text-center text-xl tracking-[0.2em]" value={passcode} onChange={e => setPasscode(e.target.value)} />
              </div>
              {authError && <p className="text-red-400 text-xs mt-3 font-semibold text-center animate-pulse">{authError}</p>}
            </div>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-white text-slate-900 hover:bg-slate-100 font-bold py-4 rounded-2xl transition-all shadow-xl shadow-white/10 text-lg">
              Authenticate
            </motion.button>
          </form>
        </motion.div>
      </div>
    )
  }

  // ----------------------------------------------------
  // --- MAIN DASHBOARD (SAAS REDESIGN)
  // ----------------------------------------------------
  const themeBg = isDarkMode ? 'bg-[#0a0f1c] text-slate-100' : 'bg-[#f4f7fb] text-slate-800'
  const cardBg = isDarkMode ? 'bg-slate-900/50 backdrop-blur-2xl border-white/5 shadow-2xl shadow-black/40' : 'bg-white/80 backdrop-blur-2xl border-white/60 shadow-xl shadow-slate-200/50'
  const textPrimary = isDarkMode ? 'text-white' : 'text-slate-900'
  const textSecondary = isDarkMode ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`min-h-screen ${themeBg} font-sans transition-colors duration-700 pb-24 relative overflow-hidden`}>
      
      {/* Dynamic Background Mesh */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className={`absolute top-0 right-0 w-[800px] h-[800px] rounded-full blur-[120px] transition-all duration-1000 ${isDarkMode ? 'bg-blue-900/10' : 'bg-blue-200/40'} -translate-y-1/2 translate-x-1/3`}></div>
        <div className={`absolute bottom-0 left-0 w-[600px] h-[600px] rounded-full blur-[100px] transition-all duration-1000 ${isDarkMode ? 'bg-purple-900/10' : 'bg-purple-200/40'} translate-y-1/3 -translate-x-1/4`}></div>
      </div>

      {/* Floating Island Header */}
      <motion.header initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="sticky top-6 z-40 max-w-7xl mx-auto px-4 sm:px-6 mb-12">
        <div className={`rounded-[2rem] p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border transition-all duration-500 ${isDarkMode ? 'bg-slate-900/80 border-white/10 shadow-2xl shadow-black/50' : 'bg-white/90 border-white shadow-2xl shadow-slate-300/50'} backdrop-blur-2xl`}>
          
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-4 cursor-pointer" onClick={() => setFamily(null)}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg p-2 border ${isDarkMode ? 'bg-slate-900 shadow-slate-900/30 border-white/10' : 'bg-white shadow-slate-200/50 border-slate-100'}`}>
                <img src={isDarkMode ? "/looowhite.png" : "/loooBlack.png"} alt="Trinity Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className={`text-xl font-extrabold tracking-tight leading-tight ${textPrimary}`}>Trinity Portal</h1>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {authRole}
                  </span>
                </div>
              </div>
            </motion.div>
            
            <div className="flex sm:hidden items-center gap-1">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2.5 rounded-full hover:bg-slate-500/10 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500"/> : <Moon className="w-5 h-5 text-slate-500"/>}
              </button>
              <button onClick={() => setAuthRole(null)} className="p-2.5 rounded-full hover:bg-red-500/10 text-red-500 transition-colors">
                <LogOut className="w-5 h-5"/>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[400px]">
              <input type="text" placeholder="Search by Name or Membership ID..." className={`w-full pl-12 pr-6 py-3.5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${isDarkMode ? 'bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950' : 'bg-slate-100/50 border border-transparent text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:shadow-lg'}`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }} />
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
              
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 5, scale: 0.95 }} transition={{ duration: 0.2 }} className={`absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl shadow-2xl overflow-hidden z-50 border backdrop-blur-xl ${isDarkMode ? 'bg-slate-900/90 border-slate-700 shadow-black/50' : 'bg-white/90 border-slate-100 shadow-slate-300/50'}`}>
                    {suggestions.map(s => (
                      <div key={s.id} onClick={() => selectFamily(s)} className={`px-5 py-4 cursor-pointer flex items-center gap-4 transition-colors ${isDarkMode ? 'hover:bg-slate-800/80 border-b border-slate-800' : 'hover:bg-slate-50 border-b border-slate-50'} last:border-0`}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(s.head_name)}&background=random&color=fff&rounded=true`} className="w-10 h-10 shadow-sm" alt="avatar" />
                        <div className="flex-1"><p className={`font-bold text-sm ${textPrimary}`}>{s.head_name}</p><p className={`text-xs font-medium ${textSecondary}`}>{s.membership_id}</p></div>
                        <ChevronRight className={`w-4 h-4 ${textSecondary}`} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="hidden sm:flex items-center gap-1 bg-slate-500/5 p-1 rounded-2xl">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setIsDarkMode(!isDarkMode)} className="p-3 rounded-xl hover:bg-slate-500/10 transition-colors">
                {isDarkMode ? <Sun className="w-5 h-5 text-yellow-500"/> : <Moon className="w-5 h-5 text-slate-500"/>}
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setAuthRole(null)} className="p-3 rounded-xl hover:bg-red-500/10 transition-colors text-red-500" title="Log Out">
                <LogOut className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* --- GLOBAL OVERVIEW --- */}
        {!family && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-4">
              <div>
                <h2 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${textPrimary}`}>Overview</h2>
                <p className={`text-sm mt-1 font-medium ${textSecondary}`}>Manage your entire church congregation seamlessly.</p>
              </div>
              {authRole === 'admin' && (
                <div className="flex flex-wrap items-center gap-3">
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportBackup} className={`${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`}>
                    <Download className="w-4 h-4" /> Backup
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBroadcastModal(true)} className={`${isDarkMode ? 'bg-slate-800 text-orange-400 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`}>
                    <Megaphone className="w-4 h-4 text-orange-500" /> Broadcast
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-6 rounded-2xl shadow-xl shadow-slate-900/20 dark:shadow-white/20 transition-all flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Family
                  </motion.button>
                </div>
              )}
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Families', val: stats.families, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Total Members', val: stats.members, icon: User, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Total Receipts', val: stats.txCount, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
              ].map((stat, i) => (
                <div key={i} className={`${cardBg} rounded-3xl p-6 border flex items-center gap-6 transition-all duration-500 hover:scale-[1.02]`}>
                  <div className={`w-16 h-16 ${stat.bg} rounded-2xl flex items-center justify-center shrink-0`}><stat.icon className={`w-8 h-8 ${stat.color}`} /></div>
                  <div><p className={`text-xs font-bold uppercase tracking-widest ${textSecondary} mb-1`}>{stat.label}</p><p className={`text-4xl font-extrabold tracking-tight ${textPrimary}`}>{stat.val}</p></div>
                </div>
              ))}
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Analytics Chart */}
              {authRole === 'admin' && (
                <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border transition-colors duration-500 lg:col-span-3`}>
                  <h3 className={`text-xl font-bold mb-8 flex items-center gap-3 ${textPrimary}`}><PieChartIcon className="w-6 h-6 text-blue-500"/> Financial Analytics</h3>
                  {chartData.length > 0 ? (
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={chartData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value" stroke="none">
                            {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} style={{ filter: `drop-shadow(0px 10px 10px ${CHART_COLORS[index % CHART_COLORS.length]}40)` }} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => `₹${Number(value).toLocaleString()}`} contentStyle={{backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', borderRadius: '16px', border: isDarkMode ? '1px solid #1e293b' : 'none', color: isDarkMode ? '#f8fafc' : '#0f172a', padding: '12px 20px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'}} itemStyle={{fontWeight: 'bold'}} />
                          <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px', fontWeight: '500' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : <div className={`h-[280px] flex items-center justify-center text-sm font-medium ${textSecondary}`}>Generate receipts to view analytics.</div>}
                </motion.div>
              )}

              {/* Birthdays Section */}
              <motion.div variants={scaleIn} className={`bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 rounded-3xl p-8 shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden ${authRole !== 'admin' ? 'lg:col-span-5' : 'lg:col-span-2'}`}>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                
                <h3 className="text-xl font-bold mb-8 flex items-center gap-3 relative z-10"><Gift className="w-6 h-6 text-pink-300" /> Birthdays in {new Date().toLocaleString('default', { month: 'long' })}</h3>
                
                <div className="space-y-4 relative z-10">
                  {upcomingBirthdays.length > 0 ? upcomingBirthdays.map(m => (
                    <motion.div whileHover={{ scale: 1.02 }} key={m.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                      <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`} className="w-12 h-12 rounded-full border-2 border-white/30" alt="avatar" />
                      <div><p className="font-bold text-base leading-tight">{m.name}</p><p className="text-xs text-blue-100 mt-1 font-medium">{m.birth_date} • {m.families?.head_name}'s Family</p></div>
                    </motion.div>
                  )) : <p className="text-blue-200 font-medium bg-white/5 p-4 rounded-xl border border-white/10">No birthdays recorded for this month.</p>}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* --- SELECTED FAMILY VIEW --- */}
        {!loading && family && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <motion.div variants={fadeUp} className={`${cardBg} rounded-[2.5rem] p-8 border transition-colors duration-500 relative`}>
                {authRole === 'admin' && (
                  <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditFam(family); setShowEditFamModal(true) }} className={`absolute top-6 right-6 p-3 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}><Edit3 className="w-4 h-4" /></motion.button>
                )}
                <div className="flex flex-col items-center text-center mb-8">
                  <div className="relative mb-4">
                    <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(family.head_name)}&background=random&color=fff&size=128`} className="w-24 h-24 rounded-3xl shadow-xl shadow-slate-500/20" alt="avatar" />
                    <div className="absolute -bottom-2 -right-2 bg-blue-500 text-white text-[10px] font-extrabold px-3 py-1 rounded-full border-2 border-white dark:border-slate-800 shadow-sm">{family.membership_id}</div>
                  </div>
                  <h2 className={`text-2xl font-extrabold leading-tight ${textPrimary}`}>{family.head_name}</h2>
                  <p className={`text-sm font-semibold mt-1 ${textSecondary}`}>Head of Family</p>
                </div>
                
                <div className="space-y-5 pt-6 border-t border-slate-500/10">
                  <div className="flex items-start gap-4"><div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-500 shrink-0"><MapPin className="w-5 h-5" /></div><div><p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-0.5`}>Address</p><p className={`text-sm font-semibold leading-relaxed ${textPrimary}`}>{family.address || 'N/A'}</p></div></div>
                  <div className="flex items-start gap-4"><div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-500 shrink-0"><Phone className="w-5 h-5" /></div><div><p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-0.5`}>Mobile</p><p className={`text-sm font-semibold ${textPrimary}`}>{family.mobile || 'N/A'}</p></div></div>
                </div>
              </motion.div>

              {/* Receipt Generator */}
              {authRole === 'admin' && (
                <motion.div variants={fadeUp} className="bg-slate-900 dark:bg-slate-950 rounded-[2.5rem] p-8 shadow-2xl border border-slate-800 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
                  <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10"><div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><FileText className="w-5 h-5" /></div> Generate Receipt</h3>
                  
                  <AnimatePresence>
                    {successMsg && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-6 p-3 bg-emerald-500/20 text-emerald-400 text-sm font-medium rounded-xl flex items-center gap-2 border border-emerald-500/20"><CheckCircle2 className="w-5 h-5" /> {successMsg}</motion.div>}
                  </AnimatePresence>
                  
                  <form onSubmit={handleSaveReceipt} className="space-y-5 relative z-10">
                    <div><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Amount (₹)</label><input type="number" required min="1" className="w-full bg-slate-800/50 rounded-2xl px-5 py-3.5 text-white border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-bold text-lg" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Purpose</label>
                      <select className="w-full bg-slate-800/50 rounded-2xl px-5 py-3.5 text-white border border-slate-700 focus:border-blue-500 focus:outline-none transition-all font-semibold appearance-none" value={purpose} onChange={e => setPurpose(e.target.value)}>
                        <option>Tithes</option><option>Thanksgiving</option><option>Offering</option><option>Mission</option><option>Building Fund</option>
                      </select>
                    </div>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSaving} className="w-full bg-blue-600 hover:bg-blue-500 font-bold py-4 rounded-2xl mt-4 shadow-lg shadow-blue-500/30">{isSaving ? 'Processing...' : 'Save & Generate'}</motion.button>
                  </form>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-8">
              {/* Receipt History */}
              {authRole === 'admin' && (
                <motion.div variants={scaleIn} className={`${cardBg} rounded-[2.5rem] p-6 sm:p-8 border transition-colors duration-500`}>
                  <h3 className={`text-2xl font-extrabold mb-8 ${textPrimary}`}>Financial History</h3>
                  <div className="space-y-4">
                    {transactions.map((tx, i) => (
                      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} key={tx.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/80' : 'bg-slate-50 border-slate-100 hover:shadow-md hover:bg-white'}`}>
                        <div className="mb-4 sm:mb-0">
                          <p className={`font-bold text-lg ${textPrimary}`}>{tx.purpose}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs font-medium px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{tx.receipt_number}</span>
                            <span className={`text-xs font-medium ${textSecondary}`}>{new Date(tx.payment_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <span className="text-2xl font-extrabold text-emerald-500 mr-3">₹{tx.amount.toLocaleString()}</span>
                          <motion.button whileHover={{ scale: 1.1 }} onClick={() => handleDeleteReceipt(tx.id)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title="Delete Receipt"><Trash2 className="w-5 h-5" /></motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} onClick={() => sendWhatsApp(tx)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} title="Send WhatsApp"><MessageCircle className="w-5 h-5" /></motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} onClick={() => printReceipt(tx)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="Print Receipt"><Printer className="w-5 h-5" /></motion.button>
                        </div>
                      </motion.div>
                    ))}
                    {transactions.length === 0 && <div className={`text-center py-10 font-medium ${textSecondary} bg-slate-500/5 rounded-2xl border border-slate-500/10 border-dashed`}>No receipts generated yet.</div>}
                  </div>
                </motion.div>
              )}

              {/* Members Table */}
              <motion.div variants={scaleIn} className={`${cardBg} rounded-[2.5rem] p-6 sm:p-8 border transition-colors duration-500`}>
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className={`text-2xl font-extrabold ${textPrimary}`}>Dependents</h3>
                    <p className={`text-sm font-medium mt-1 ${textSecondary}`}>Total {members.length} member(s)</p>
                  </div>
                  {authRole === 'admin' && (
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddMemberModal(true)} className="flex items-center gap-2 text-sm bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold px-4 py-2.5 rounded-xl hover:bg-blue-500/20 transition-colors"><UserPlus className="w-4 h-4"/> Add New</motion.button>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className={`border-b-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-100'} text-xs font-bold uppercase tracking-wider ${textSecondary}`}>
                      <tr><th className="pb-4 px-3">Name</th><th className="pb-4 px-3">Relation</th><th className="pb-4 px-3">DOB</th>{authRole === 'admin' && <th className="pb-4 px-3 text-right">Action</th>}</tr>
                    </thead>
                    <tbody className="text-sm font-medium">
                      {members.map((m, i) => (
                        <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} key={m.id} className={`group border-b ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-4">
                              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff&rounded=true`} className="w-10 h-10 shadow-sm" alt="avatar"/>
                              <span className={`text-base font-bold ${textPrimary}`}>{m.name}</span>
                            </div>
                          </td>
                          <td className={`py-4 px-3 ${textSecondary}`}>{m.relationship || '-'}</td><td className={`py-4 px-3 ${textSecondary}`}>{m.birth_date || '-'}</td>
                          {authRole === 'admin' && (
                            <td className="py-4 px-3 text-right">
                              <button onClick={() => { setEditDependent(m); setShowEditDependentModal(true) }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                            </td>
                          )}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div> 
              </motion.div>
            </div>
          </motion.div>
        )}
      </main>

        {/* --- MODALS --- */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-start justify-center p-4 pt-12 sm:pt-20 overflow-y-auto">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`rounded-[2.5rem] p-8 sm:p-10 w-full max-w-2xl shadow-2xl relative my-8 border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}>
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-3 rounded-full hover:bg-slate-500/10 text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-3xl font-extrabold mb-8">Register New Family</h2>
                <form onSubmit={handleAddFamily} className="space-y-8">
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest border-b border-slate-500/20 pb-3">Primary Contact Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Head of Family Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.head_name} onChange={e => setNewFam({...newFam, head_name: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Mobile Number</label><input type="text" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.mobile} onChange={e => setNewFam({...newFam, mobile: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Email Address</label><input type="email" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.email} onChange={e => setNewFam({...newFam, email: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">City / Place</label><input type="text" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.place} onChange={e => setNewFam({...newFam, place: e.target.value})} /></div>
                      <div className="sm:col-span-2"><label className="text-sm font-bold block mb-2 text-slate-500">Full Address</label><textarea className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.address} onChange={e => setNewFam({...newFam, address: e.target.value})} rows={2}></textarea></div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-pink-500 uppercase tracking-widest border-b border-slate-500/20 pb-3">Head Personal Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium transition-all appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.gender} onChange={e => setNewFam({...newFam, gender: e.target.value})}><option value="">Select Gender</option><option>Male</option><option>Female</option></select></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth</label><input type="text" placeholder="e.g. 28.Oct.1977" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.birth_date} onChange={e => setNewFam({...newFam, birth_date: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Baptism Date</label><input type="text" placeholder="e.g. 15.May.1990" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.baptism_date} onChange={e => setNewFam({...newFam, baptism_date: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Marriage Date</label><input type="text" placeholder="e.g. 05.Dec.2005" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.marriage_date} onChange={e => setNewFam({...newFam, marriage_date: e.target.value})} /></div>
                    </div>
                  </div>
                  <div className="pt-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl shadow-xl shadow-blue-500/30 text-lg transition-all">{isWorking ? 'Registering...' : 'Register Complete Profile'}</motion.button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
          
          {/* Other simple modals upgraded slightly */}
          {showEditFamModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}><button onClick={() => setShowEditFamModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button><h2 className="text-2xl font-extrabold mb-8">Edit Family Info</h2><form onSubmit={handleEditFamily} className="space-y-5"><div><label className="text-sm font-bold block mb-2 text-slate-500">Head Name</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editFam.head_name} onChange={e => setEditFam({...editFam, head_name: e.target.value})} /></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Mobile</label><input type="text" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editFam.mobile} onChange={e => setEditFam({...editFam, mobile: e.target.value})} /></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Address</label><textarea className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editFam.address} onChange={e => setEditFam({...editFam, address: e.target.value})} rows={2}></textarea></div><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-4 rounded-2xl mt-4 shadow-xl shadow-emerald-500/30 text-lg transition-all">{isWorking ? 'Saving...' : 'Update Details'}</motion.button></form></motion.div>
            </div>
          )}

          {showAddMemberModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}><button onClick={() => setShowAddMemberModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button><h2 className="text-2xl font-extrabold mb-8">Add Dependent</h2><form onSubmit={handleAddMember} className="space-y-5"><div><label className="text-sm font-bold block mb-2 text-slate-500">Full Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-5"><div><label className="text-sm font-bold block mb-2 text-slate-500">Relation</label><input type="text" placeholder="e.g. Son" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.relationship} onChange={e => setNewMember({...newMember, relationship: e.target.value})} /></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.gender} onChange={e => setNewMember({...newMember, gender: e.target.value})}><option value="">Select</option><option>Male</option><option>Female</option></select></div></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth (Optional)</label><input type="text" placeholder="e.g. 15.May.2010" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.birth_date} onChange={e => setNewMember({...newMember, birth_date: e.target.value})} /></div><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl mt-4 shadow-xl shadow-blue-500/30 text-lg transition-all">{isWorking ? 'Adding...' : 'Add Member'}</motion.button></form></motion.div>
            </div>
          )}

          {showEditDependentModal && editDependent && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}><button onClick={() => setShowEditDependentModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button><h2 className="text-2xl font-extrabold mb-8">Edit Dependent</h2><form onSubmit={handleEditDependent} className="space-y-5"><div><label className="text-sm font-bold block mb-2 text-slate-500">Full Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.name} onChange={e => setEditDependent({...editDependent, name: e.target.value})} /></div><div className="grid grid-cols-2 gap-5"><div><label className="text-sm font-bold block mb-2 text-slate-500">Relation</label><input type="text" placeholder="e.g. Son" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.relationship} onChange={e => setEditDependent({...editDependent, relationship: e.target.value})} /></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.gender} onChange={e => setEditDependent({...editDependent, gender: e.target.value})}><option value="">Select</option><option>Male</option><option>Female</option></select></div></div><div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth (Optional)</label><input type="text" placeholder="e.g. 15.May.2010" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.birth_date} onChange={e => setEditDependent({...editDependent, birth_date: e.target.value})} /></div><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl mt-4 shadow-xl shadow-blue-500/30 text-lg transition-all">{isWorking ? 'Updating...' : 'Update Member'}</motion.button></form></motion.div>
            </div>
          )}

          {showBroadcastModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}><button onClick={() => setShowBroadcastModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button><h2 className="text-2xl font-extrabold mb-2 flex items-center gap-3"><div className="p-2 bg-orange-500/10 rounded-xl"><Megaphone className="w-6 h-6 text-orange-500"/></div> Broadcast</h2><p className={`text-sm mb-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Send an announcement to all {stats.families} families.</p><div className="space-y-5"><div><textarea className={`w-full border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} rows={4} placeholder="Type your announcement here..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}></textarea></div><motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleBroadcast} disabled={!broadcastMsg} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-500/30 text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"><MessageCircle className="w-6 h-6"/> Send via WhatsApp (Mock)</motion.button></div></motion.div>
            </div>
          )}
        </AnimatePresence>
      {/* --- MODALS moved outside main to fix z-index overlay issues --- */}
    </div>
  )
}
