'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { User, MapPin, Phone, Calendar, Users, FileText, CheckCircle2, Plus, Printer, TrendingUp, MessageCircle, X, Gift, Megaphone, PieChart as PieChartIcon, Download, Edit3, UserPlus, Trash2, Cake, Search } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import DashboardShell from '@/components/DashboardShell'
import SearchEngine from '@/components/SearchEngine'
import dynamic from 'next/dynamic'
const AIChatBot = dynamic(() => import('@/components/AIChatBot'), { ssr: false })
import NotificationToggle from '@/components/NotificationToggle'
import { parseDayFromDate, isTodayBirthday, isTodayAnniversary, isTodayBaptism, isMonthMatch, CHART_COLORS, staggerContainer, fadeUp, scaleIn, notifySystemAction } from '@/utils/helpers'
import { generateReceiptPDF, downloadPDF, sendWhatsApp, printReceipt, generateMonthlyReportPDF } from '@/utils/pdf'
import type { Family, Member, Transaction, AnniversaryGroup } from '@/utils/types'

const calculateAge = (dob: string | null) => {
  if (!dob) return '';
  const diffMs = Date.now() - new Date(dob).getTime();
  const ageDt = new Date(diffMs);
  const age = Math.abs(ageDt.getUTCFullYear() - 1970);
  return ` (${age} yrs)`;
}

export default function Home() {
  const router = useRouter()
  const { authRole, isLoading: authLoading } = useAuth()
  const { isDarkMode, cardBg, textPrimary, textSecondary, inputBg } = useTheme()

  const [loading, setLoading] = useState(false)
  
  const [family, setFamily] = useState<Family | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  
  const [stats, setStats] = useState({ families: 0, members: 0, txCount: 0 })
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<(Member & { families?: any })[]>([])
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<AnniversaryGroup[]>([])
  const [upcomingBaptisms, setUpcomingBaptisms] = useState<(Member & { families?: any })[]>([])
  const [chartData, setChartData] = useState<{name: string, value: number}[]>([])
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [chartLoading, setChartLoading] = useState(false)
  const [todayBirthdays, setTodayBirthdays] = useState<(Member & { families?: any })[]>([])
  const [showBirthdayNotif, setShowBirthdayNotif] = useState(true)

  const [amount, setAmount] = useState(''); const [purpose, setPurpose] = useState('Tithes'); const [remarks, setRemarks] = useState('')
  const [editingTxId, setEditingTxId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false); const [successMsg, setSuccessMsg] = useState('')
  
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false); const [broadcastMsg, setBroadcastMsg] = useState('')
  const [broadcastList, setBroadcastList] = useState<{head_name: string, mobile: string}[]>([])
  const [broadcastIndex, setBroadcastIndex] = useState(0)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [showTodayOnly, setShowTodayOnly] = useState(true)
  const [showEditFamModal, setShowEditFamModal] = useState(false)
  const [showAddMemberModal, setShowAddMemberModal] = useState(false)
  const [showEditDependentModal, setShowEditDependentModal] = useState(false)
  const [editDependent, setEditDependent] = useState<Member | null>(null)
  
  const [newFam, setNewFam] = useState({ head_name: '', mobile: '', address: '', place: '', email: '', gender: '', birth_date: '', baptism_date: '', marriage_date: '' })
  const [editFam, setEditFam] = useState({ head_name: '', mobile: '', address: '' })
  const [newMember, setNewMember] = useState({ name: '', relationship: '', birth_date: '', marriage_date: '', baptism_date: '', gender: '' })
  const [isWorking, setIsWorking] = useState(false)
  const [logoBase64, setLogoBase64] = useState('')

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !authRole) router.replace('/login');
  }, [authRole, authLoading, router]);

  useEffect(() => {
    fetch('/loooBlack.png').then(r => r.blob()).then(blob => {
      const reader = new FileReader()
      reader.onload = () => setLogoBase64(reader.result as string)
      reader.readAsDataURL(blob)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!authRole) return;
    async function loadDashboard() {
      const [{ count: fCount }, { count: mCount }, { count: txCount }, { data: allMembers }] = await Promise.all([
        supabase.from('families').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('members').select('id, name, family_id, birth_date, marriage_date, baptism_date, relationship, gender, families(head_name, mobile)')
      ])
      setStats({ families: fCount || 0, members: mCount || 0, txCount: txCount || 0 })
      const currentMonth = new Date().toLocaleString('default', { month: 'short' })
      if (allMembers) {
        // Birthdays - filter and sort by day ascending
        const bdays = (allMembers as any[])
          .filter(m => m.birth_date && isMonthMatch(m.birth_date, currentMonth))
          .sort((a, b) => parseDayFromDate(a.birth_date) - parseDayFromDate(b.birth_date))
        setUpcomingBirthdays(bdays)

        // Detect today's birthdays for notification
        const todayBdays = bdays.filter(m => isTodayBirthday(m.birth_date))
        setTodayBirthdays(todayBdays)
        if (todayBdays.length > 0) setShowBirthdayNotif(true)

        // Anniversaries - filter, group, and sort by day ascending
        const annivMembers = (allMembers as any[]).filter(m => m.marriage_date && isMonthMatch(m.marriage_date, currentMonth))
        const annivGrouped: Record<string, { names: string[]; marriage_date: string; family_name: string; mobile: string }> = {}
        annivMembers.forEach(m => {
          const key = `${m.family_id}_${m.marriage_date}`
          if (!annivGrouped[key]) annivGrouped[key] = { names: [], marriage_date: m.marriage_date, family_name: m.families?.head_name || '', mobile: m.families?.mobile || '' }
          annivGrouped[key].names.push(m.name)
        })
        setUpcomingAnniversaries(
          Object.entries(annivGrouped)
            .map(([key, v]) => ({ names: v.names.join(' & '), marriage_date: v.marriage_date, family_name: v.family_name, mobile: (v as any).mobile, key }))
            .sort((a, b) => parseDayFromDate(a.marriage_date) - parseDayFromDate(b.marriage_date))
        )

        // Baptisms - filter and sort by day ascending
        const baptisms = (allMembers as any[])
          .filter(m => m.baptism_date && isMonthMatch(m.baptism_date, currentMonth))
          .sort((a, b) => parseDayFromDate(a.baptism_date) - parseDayFromDate(b.baptism_date))
        setUpcomingBaptisms(baptisms)
      }
    }
    loadDashboard()
  }, [authRole])

  useEffect(() => {
    if (!authRole) return;
    async function fetchChartData() {
      setChartLoading(true);
      let query = supabase.from('transactions').select('amount, purpose');
      if (startDate) query = query.gte('payment_date', `${startDate}T00:00:00Z`);
      if (endDate) query = query.lte('payment_date', `${endDate}T23:59:59Z`);
      const { data: allTx } = await query;
      if (allTx && allTx.length > 0) {
        const grouped = allTx.reduce((acc: any, tx) => { acc[tx.purpose] = (acc[tx.purpose] || 0) + Number(tx.amount); return acc; }, {});
        const total = Object.values(grouped).reduce((s: number, v: any) => s + v, 0) as number;
        const entries = Object.entries(grouped).map(([k, v]) => ({ name: k, value: v as number }));
        const threshold = total * 0.01;
        const major = entries.filter(e => e.value >= threshold);
        const minorTotal = entries.filter(e => e.value < threshold).reduce((s, e) => s + e.value, 0);
        if (minorTotal > 0) major.push({ name: 'Other', value: minorTotal });
        setChartData(major.sort((a, b) => b.value - a.value));
      } else {
        setChartData([]);
      }
      setChartLoading(false);
    }
    fetchChartData();
  }, [authRole, startDate, endDate, stats.txCount]);

  const selectFamily = async (selectedFamily: Family) => {
    setLoading(true); setFamily(selectedFamily); setSuccessMsg('')
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
    try {
      if (editingTxId) {
        const { data: updatedTx, error } = await supabase.from('transactions').update({ amount: Number(amount), purpose, remarks: remarks || null }).eq('id', editingTxId).select().single()
        if (error) throw error
        setTransactions(transactions.map(t => t.id === editingTxId ? updatedTx : t))
        setSuccessMsg('Receipt updated successfully!')
        setEditingTxId(null)
      } else {
        const receiptNumber = `REC-${Date.now()}`
        const { data: newTx, error } = await supabase.from('transactions').insert({ family_id: family.id, receipt_number: receiptNumber, amount: Number(amount), purpose, payment_date: new Date().toISOString(), remarks: remarks || null }).select().single()
        if (error) throw error
        setTransactions([newTx, ...transactions]); setStats(prev => ({ ...prev, txCount: prev.txCount + 1 }))
        setSuccessMsg('Receipt saved successfully!')
        notifySystemAction('✅ Receipt Generated', `Admin generated receipt ${receiptNumber} for ₹${amount}.`)
      }
      setAmount(''); setPurpose('Tithes'); setRemarks('')
      setTimeout(() => setSuccessMsg(''), 3000)
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
      notifySystemAction('🏠 Family Added', `Admin added new family: ${newFam.head_name}.`)
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
      const { data: mData, error } = await supabase.from('members').insert({ family_id: family?.id, name: newMember.name, relationship: newMember.relationship, gender: newMember.gender, birth_date: newMember.birth_date, baptism_date: newMember.baptism_date, marriage_date: newMember.marriage_date }).select().single()
      if (error) throw error
      setMembers([...members, mData]); setShowAddMemberModal(false); setNewMember({ name: '', relationship: '', birth_date: '', marriage_date: '', baptism_date: '', gender: '' })
      notifySystemAction('👤 Member Added', `Admin added ${newMember.name} to ${family?.head_name}'s family.`)
    } catch(err) { alert("Error adding member.") } finally { setIsWorking(false) }
  }

  const handleEditDependent = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editDependent) return; setIsWorking(true)
    try {
      const { data, error } = await supabase.from('members').update({ name: editDependent.name, relationship: editDependent.relationship, gender: editDependent.gender, birth_date: editDependent.birth_date, baptism_date: editDependent.baptism_date, marriage_date: editDependent.marriage_date }).eq('id', editDependent.id).select().single()
      if (error) throw error
      setMembers(members.map(m => m.id === data.id ? data : m)); setShowEditDependentModal(false)
    } catch(err) { alert("Error updating member.") } finally { setIsWorking(false) }
  }

  const handleBroadcast = async () => {
    if(!broadcastMsg) return;
    setIsWorking(true)
    try {
      const { data, error } = await supabase.from('families').select('head_name, mobile').not('mobile', 'is', null)
      if (error) throw error
      if (data && data.length > 0) {
        setBroadcastList(data)
        setBroadcastIndex(0)
        setIsBroadcasting(true)
      } else {
        alert("No families with mobile numbers found.")
      }
    } catch (err) {
      alert("Error fetching family list.")
    } finally {
      setIsWorking(false)
    }
  }

  const sendIndividualBroadcast = (fam: {head_name: string, mobile: string}) => {
    if (!fam.mobile) return;
    let phone = fam.mobile.replace(/\D/g, '');
    if (phone.length === 10) phone = `91${phone}`
    const msg = `*Trinity Prayer House*\n\nDear ${fam.head_name},\n\n${broadcastMsg}\n\n_God Bless You!_\n\nPr Vasanth Sathyanathan`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    
    if (broadcastIndex < broadcastList.length - 1) {
      setBroadcastIndex(broadcastIndex + 1)
    } else {
      alert("Broadcast session completed!")
      setIsBroadcasting(false)
      setShowBroadcastModal(false)
      setBroadcastMsg('')
      setBroadcastList([])
    }
  }
  const handleDeleteReceipt = async (txId: string) => { if (!confirm("Delete this receipt permanently?")) return; try { await supabase.from('transactions').delete().eq('id', txId); setTransactions(transactions.filter(t => t.id !== txId)); setStats(prev => ({ ...prev, txCount: Math.max(0, prev.txCount - 1) })) } catch(err) { alert("Failed to delete.") } }

  const handleDeleteFamily = async () => {
    if (!family) return;
    if (!confirm(`Delete the family "${family.head_name}" and ALL their members and receipts permanently? This cannot be undone.`)) return;
    try {
      await supabase.from('transactions').delete().eq('family_id', family.id);
      await supabase.from('members').delete().eq('family_id', family.id);
      await supabase.from('families').delete().eq('id', family.id);
      setFamily(null); setMembers([]); setTransactions([]);
      setStats(prev => ({ ...prev, families: Math.max(0, prev.families - 1) }));
    } catch(err) { alert("Failed to delete family.") }
  }

  const handleDeleteMember = async (memberId: string, memberName: string) => {
    if (!confirm(`Delete "${memberName}" from this family permanently?`)) return;
    try {
      await supabase.from('members').delete().eq('id', memberId);
      setMembers(members.filter(m => m.id !== memberId));
      setStats(prev => ({ ...prev, members: Math.max(0, prev.members - 1) }));
    } catch(err) { alert("Failed to delete member.") }
  }

  const handleExportDirectory = async () => {
    setIsWorking(true);
    try {
      const { data: fams } = await supabase.from('families').select('id, membership_id, head_name, mobile, address, place, email, join_date');
      const { data: mems } = await supabase.from('members').select('id, family_id, name, relationship, gender, birth_date, baptism_date, marriage_date');
      if (!fams || !mems) return;
      const rows: string[] = ['Membership ID,Family Head,Mobile,Address,Place,Dependent Name,Relationship,Gender,DOB,Baptism Date,Marriage Date'];
      fams.forEach(f => {
        rows.push(`"${f.membership_id}","${f.head_name}","${f.mobile || ''}","${f.address || ''}","${f.place || ''}","","Head","","","",""`);
        const deps = mems.filter(m => m.family_id === f.id);
        deps.forEach(d => {
          rows.push(`"${f.membership_id}","${f.head_name}","","","","${d.name}","${d.relationship}","${d.gender}","${d.birth_date || ''}","${d.baptism_date || ''}","${d.marriage_date || ''}"`);
        });
      });
      const csvContent = rows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `TPH_Directory_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch(err) { alert("Failed to export directory."); } finally { setIsWorking(false); }
  }

  const handleMonthlyReport = async () => {
    setIsWorking(true);
    try {
      const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
      const { data: txs } = await supabase.from('transactions').select('*').gte('payment_date', `${currentMonthStr}-01T00:00:00Z`).lte('payment_date', `${currentMonthStr}-31T23:59:59Z`).order('payment_date', { ascending: true });
      if (!txs || txs.length === 0) { alert("No transactions found for this month."); return; }
      generateMonthlyReportPDF(txs, currentMonthStr);
    } catch(err) { alert("Failed to generate report."); } finally { setIsWorking(false); }
  }

  // Show loading while checking auth
  if (authLoading || !authRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardShell>
      {/* Floating Search Bar */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`relative z-50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 border ${isDarkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/80 border-white'} backdrop-blur-xl shadow-lg`}>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setFamily(null)}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm p-1.5 border ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-100'}`}>
            <img src={isDarkMode ? "/looowhite.png" : "/loooBlack.png"} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className={`text-lg font-extrabold tracking-tight ${textPrimary}`}>Dashboard</h1>
        </div>
        <SearchEngine onSelectFamily={selectFamily} />
      </motion.div>



      {/* 🎂 Birthday Notification Banner */}
      <AnimatePresence>
        {showBirthdayNotif && todayBirthdays.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed top-4 right-4 z-50 w-[90%] max-w-sm sm:max-w-md"
          >
            <div className="bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 rounded-2xl sm:rounded-3xl p-[2px] shadow-2xl shadow-pink-500/30">
              <div className={`${isDarkMode ? 'bg-slate-900' : 'bg-white'} rounded-2xl sm:rounded-3xl p-5 sm:p-6 relative overflow-hidden`}>
                {/* Confetti-like decorative dots */}
                <div className="absolute top-2 left-4 w-2 h-2 bg-pink-400 rounded-full opacity-60 animate-pulse"></div>
                <div className="absolute top-4 right-8 w-1.5 h-1.5 bg-amber-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.3s' }}></div>
                <div className="absolute bottom-3 left-10 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-60 animate-pulse" style={{ animationDelay: '0.6s' }}></div>
                
                <button onClick={() => setShowBirthdayNotif(false)} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-slate-500/10 text-slate-400 transition-colors z-10">
                  <X className="w-4 h-4" />
                </button>
                
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-amber-400 via-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-pink-500/30">
                    <Cake className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 bg-gradient-to-r from-amber-500 via-pink-500 to-purple-600 bg-clip-text text-transparent`}>🎉 Birthday Today!</p>
                    <div className="space-y-1">
                      {todayBirthdays.map(m => (
                        <p key={m.id} className={`text-sm sm:text-base font-bold ${textPrimary} truncate`}>
                          {m.name} <span className={`text-xs font-medium ${textSecondary}`}>• {m.families?.head_name}&apos;s Family</span>
                        </p>
                      ))}
                    </div>
                    <p className={`text-xs mt-2 font-medium ${textSecondary}`}>Wish them a blessed birthday! 🎂</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



        
        {/* --- GLOBAL OVERVIEW --- */}
        {loading && !family && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 animate-pulse">
            <div className={`h-20 w-1/3 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
            <div className={`h-64 sm:h-80 w-full rounded-[2.5rem] ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <div key={i} className={`h-28 rounded-3xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>)}
            </div>
          </motion.div>
        )}

        {!family && !loading && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6 sm:space-y-8">
            <motion.div variants={fadeUp} className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 mb-2 sm:mb-4">
              <div>
                <h2 className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${textPrimary}`}>Overview</h2>
                <p className={`text-sm mt-1 font-medium ${textSecondary}`}>Manage your entire church congregation seamlessly.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                {/* View Toggle - Now available to everyone */}
                <div className={`flex items-center p-1 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-slate-200/50 border-slate-200'}`}>
                  <button onClick={() => setShowTodayOnly(true)} className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all ${showTodayOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Today</button>
                  <button onClick={() => setShowTodayOnly(false)} className={`px-5 py-2.5 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all ${!showTodayOnly ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : (isDarkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-500 hover:text-slate-700')}`}>Month</button>
                </div>

                {authRole === 'admin' && (
                  <>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleExportDirectory} className={`${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`} title="Export to Excel">
                      <Download className="w-4 h-4 text-emerald-500" /> Export CSV
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleMonthlyReport} className={`${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`} title="Generate Monthly Financial Report">
                      <FileText className="w-4 h-4 text-blue-500" /> Month Report
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={exportBackup} className={`${isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`} title="Download Full JSON Backup">
                      <Download className="w-4 h-4 text-slate-500" /> Backup
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowBroadcastModal(true)} className={`${isDarkMode ? 'bg-slate-800 text-orange-400 hover:bg-slate-700' : 'bg-white text-slate-700 hover:bg-slate-50'} shadow-sm font-semibold py-3 px-5 rounded-2xl transition-all flex items-center gap-2 text-sm border border-transparent dark:border-white/5`}>
                      <Megaphone className="w-4 h-4 text-orange-500" /> Broadcast
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowAddModal(true)} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-3 px-6 rounded-2xl shadow-xl shadow-slate-900/20 dark:shadow-white/20 transition-all flex items-center gap-2 text-sm">
                      <Plus className="w-4 h-4" /> Add Family
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>

            {/* Premium Welcome Banner */}
            <motion.div variants={fadeUp} className={`relative overflow-hidden rounded-[2.5rem] p-8 sm:p-12 shadow-2xl border transition-all duration-500 ${isDarkMode ? 'bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-900 border-white/10 shadow-black/50' : 'bg-gradient-to-br from-white via-slate-50 to-blue-50/50 border-slate-200/60 shadow-slate-200/50'}`}>
              {/* Abstract Glassmorphic Orbs */}
              <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none mix-blend-overlay ${isDarkMode ? 'bg-blue-500/20' : 'bg-blue-400/20'}`}></div>
              <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none mix-blend-overlay ${isDarkMode ? 'bg-purple-500/20' : 'bg-purple-400/20'}`}></div>
              
              <div className="relative z-10 max-w-2xl">
                <h2 className={`text-3xl sm:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text ${isDarkMode ? 'bg-gradient-to-r from-white to-slate-400' : 'bg-gradient-to-r from-slate-900 to-slate-600'}`}>
                  Welcome to Trinity Portal
                </h2>
                <p className={`text-lg sm:text-xl font-medium leading-relaxed mb-8 max-w-xl ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {authRole === 'admin' 
                    ? "Manage your congregation, track financial contributions, and engage with your community effortlessly."
                    : "Access the directory and manage administrative tasks for Trinity Prayer House."}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => document.querySelector('input')?.focus()} className={`px-8 py-4 rounded-2xl font-bold transition-all shadow-xl flex items-center justify-center gap-2 ${isDarkMode ? 'bg-white text-slate-900 hover:bg-slate-100 shadow-white/10' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/20'}`}>
                    <Search className="w-5 h-5" /> Start Searching
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Stat Cards */}
            <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { label: 'Total Families', val: stats.families, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                { label: 'Total Members', val: stats.members, icon: User, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                { label: 'Total Receipts', val: stats.txCount, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
              ].map((stat, i) => (
                <div key={i} className={`${cardBg} rounded-2xl sm:rounded-3xl p-5 sm:p-6 border flex items-center gap-4 sm:gap-6 transition-all duration-500 hover:scale-[1.02]`}>
                  <div className={`w-14 h-14 sm:w-16 sm:h-16 ${stat.bg} rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0`}><stat.icon className={`w-7 h-7 sm:w-8 sm:h-8 ${stat.color}`} /></div>
                  <div><p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest ${textSecondary} mb-1`}>{stat.label}</p><p className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${textPrimary}`}>{stat.val}</p></div>
                </div>
              ))}
            </motion.div>

            {/* Push Notification Toggle */}
            <motion.div variants={fadeUp}>
              <NotificationToggle />
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-6">
              {/* Analytics Chart */}
              {authRole === 'admin' && (
                <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border transition-colors duration-500 lg:col-span-3`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <h3 className={`text-xl font-bold flex items-center gap-3 ${textPrimary}`}><PieChartIcon className="w-6 h-6 text-blue-500"/> Financial Analytics</h3>
                    <div className="flex flex-wrap items-center gap-2">
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`text-xs p-2 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                      <span className="text-slate-400 text-xs font-bold">TO</span>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`text-xs p-2 rounded-xl border outline-none font-medium ${isDarkMode ? 'bg-slate-900 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'}`} />
                      {(startDate || endDate) && (
                        <button onClick={() => { setStartDate(''); setEndDate(''); }} className="text-xs font-bold text-red-500 hover:bg-red-500/10 px-3 py-2 rounded-xl transition-all">Clear</button>
                      )}
                    </div>
                  </div>
                  {chartLoading ? (
                    <div className={`h-[280px] flex items-center justify-center`}>
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : chartData.length > 0 ? (
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
                  ) : <div className={`h-[280px] flex items-center justify-center text-sm font-medium ${textSecondary}`}>No data for this period.</div>}
                </motion.div>
              )}

              {/* Birthdays Section */}
              <motion.div variants={scaleIn} className={`bg-gradient-to-br from-indigo-600 via-blue-600 to-purple-700 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-blue-900/20 text-white relative overflow-hidden ${authRole !== 'admin' ? 'lg:col-span-5' : 'lg:col-span-2'}`}>
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                  <Gift className="w-6 h-6 text-pink-300" /> 
                  {showTodayOnly ? "Today's Birthdays" : `Birthdays this Month`}
                </h3>
                <div className="space-y-3 relative z-10 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                  {(showTodayOnly ? todayBirthdays : upcomingBirthdays).length > 0 ? (showTodayOnly ? todayBirthdays : upcomingBirthdays).map(m => {
                    const isToday = isTodayBirthday(m.birth_date);
                    return (
                      <motion.div whileHover={{ scale: 1.02 }} key={m.id} className={`backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4 shadow-lg ${isToday ? 'bg-amber-400/20 border-2 border-amber-300/60 shadow-amber-400/20' : 'bg-white/10 border border-white/20'}`}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`} className="w-12 h-12 rounded-full border-2 border-white/30 shrink-0" alt="avatar" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-tight truncate">{m.name} {isToday && <span className="ml-1 text-[10px] bg-amber-400 text-amber-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">🎂 Today</span>}</p>
                          <p className="text-xs text-blue-100 mt-1 font-medium">{m.birth_date}{calculateAge(m.birth_date)} • {m.families?.head_name}&apos;s Family</p>
                        </div>
                        {isToday && m.families?.mobile && (
                          <button onClick={() => {
                            let phone = m.families?.mobile.replace(/\D/g, '') || ''; if (phone.length === 10) phone = `91${phone}`;
                            let title = m.gender === 'Female' ? 'Sis. ' : m.gender === 'Male' ? 'Bro. ' : '';
                            const msg = `*Trinity Prayer House*\n\nDear ${title}${m.name},\nWe wish you a very *Happy and Blessed Birthday!* 🎂\nMay God bless you abundantly today and always.\n\nPs 65:11\nPsalms 65\n11. Thou crownest the year with thy goodness; and thy paths drop fatness.\nவருஷத்தை உம்முடைய நன்மையால் முடிசூட்டுகிறீர்; உமது பாதைகள் நெய்யாய்ப் பொழிகிறது.\n\n_God Bless You!_\n\nPr Vasanth Sathyanathan`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }} className="p-2.5 bg-white/20 hover:bg-emerald-500 text-white rounded-xl transition-all">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  }) : (
                    <div className="text-center py-12 px-4 bg-white/5 rounded-[2rem] border border-white/10">
                      <p className="text-2xl mb-2">{showTodayOnly ? '✨' : '📅'}</p>
                      <p className="text-blue-100 font-bold">{showTodayOnly ? 'No birthdays today' : 'No birthdays this month'}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Anniversaries & Baptisms Row */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Anniversaries Section */}
              <motion.div variants={scaleIn} className="bg-gradient-to-br from-rose-500 via-pink-600 to-amber-600 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-rose-900/20 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-amber-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                  <Calendar className="w-6 h-6 text-amber-200" /> 
                  {showTodayOnly ? "Today's Anniversaries" : `Anniversaries this Month`}
                </h3>
                <div className="space-y-3 relative z-10 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                  {(showTodayOnly ? upcomingAnniversaries.filter(a => isTodayAnniversary(a.marriage_date)) : upcomingAnniversaries).length > 0 ? (showTodayOnly ? upcomingAnniversaries.filter(a => isTodayAnniversary(a.marriage_date)) : upcomingAnniversaries).map(a => {
                    const isToday = isTodayAnniversary(a.marriage_date);
                    return (
                      <motion.div whileHover={{ scale: 1.02 }} key={a.key} className={`backdrop-blur-xl border-2 rounded-2xl p-4 flex items-center gap-4 shadow-lg ${isToday ? 'bg-white/20 border-white/40 shadow-rose-400/20' : 'bg-white/10 border-white/20'}`}>
                        <div className="w-12 h-12 rounded-full border-2 border-white/30 shrink-0 bg-white/20 flex items-center justify-center text-lg shadow-inner">💒</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-tight truncate">{a.names} {isToday && <span className="ml-1 text-[10px] bg-rose-400 text-rose-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">💍 Today</span>}</p>
                          <p className="text-xs text-rose-100 mt-1 font-medium">{a.marriage_date}{calculateAge(a.marriage_date)} • {a.family_name}&apos;s Family</p>
                        </div>
                        {isToday && (a as any).mobile && (
                          <button onClick={() => {
                            let phone = (a as any).mobile.replace(/\D/g, ''); if (phone.length === 10) phone = `91${phone}`;
                            const msg = `*Trinity Prayer House*\n\nDear Bro. & Sis. ${a.names},\nWe wish you a very *Happy and Blessed Wedding Anniversary!* 💒\nMay God bless your family and lead you in His grace.\n\n3 john 1:2\n3 John 1\n2. Beloved, I wish above all things that thou mayest prosper and be in health, even as thy soul prospereth.\nபிரியமானவனே, உன் ஆத்துமா வாழ்கிறதுபோல நீ எல்லாவற்றிலும் வாழ்ந்து சுகமாயிருக்கும்படி வேண்டுகிறேன்.\n\n_God Bless You!_\n\nPr Vasanth Sathyanathan`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }} className="p-2.5 bg-white/20 hover:bg-emerald-500 text-white rounded-xl transition-all">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  }) : (
                    <div className="text-center py-12 px-4 bg-white/5 rounded-[2rem] border border-white/10">
                      <p className="text-2xl mb-2">{showTodayOnly ? '🥂' : '📅'}</p>
                      <p className="text-rose-100 font-bold">{showTodayOnly ? 'No anniversaries today' : 'No anniversaries this month'}</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Baptisms Section */}
              <motion.div variants={scaleIn} className="bg-gradient-to-br from-teal-500 via-cyan-600 to-sky-700 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 shadow-2xl shadow-teal-900/20 text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-sky-500/20 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 relative z-10">
                  <CheckCircle2 className="w-6 h-6 text-sky-200" /> 
                  {showTodayOnly ? "Today's Baptisms" : `Baptisms this Month`}
                </h3>
                <div className="space-y-3 relative z-10 overflow-y-auto max-h-[280px] pr-2 custom-scrollbar">
                  {(showTodayOnly ? upcomingBaptisms.filter(m => isTodayBaptism(m.baptism_date)) : upcomingBaptisms).length > 0 ? (showTodayOnly ? upcomingBaptisms.filter(m => isTodayBaptism(m.baptism_date)) : upcomingBaptisms).map(m => {
                    const isToday = isTodayBaptism(m.baptism_date);
                    return (
                      <motion.div whileHover={{ scale: 1.02 }} key={m.id} className={`backdrop-blur-xl border-2 rounded-2xl p-4 flex items-center gap-4 shadow-lg ${isToday ? 'bg-white/20 border-white/40 shadow-cyan-400/20' : 'bg-white/10 border-white/20'}`}>
                        <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff`} className="w-12 h-12 rounded-full border-2 border-white/30 shrink-0" alt="avatar" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-tight truncate">{m.name} {isToday && <span className="ml-1 text-[10px] bg-cyan-400 text-cyan-900 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">🌊 Today</span>}</p>
                          <p className="text-xs text-teal-100 mt-1 font-medium">{m.baptism_date}{calculateAge(m.baptism_date)} • {m.families?.head_name}&apos;s Family</p>
                        </div>
                        {isToday && m.families?.mobile && (
                          <button onClick={() => {
                            let phone = m.families?.mobile.replace(/\D/g, '') || ''; if (phone.length === 10) phone = `91${phone}`;
                            let title = m.gender === 'Female' ? 'Sis. ' : m.gender === 'Male' ? 'Bro. ' : '';
                            const msg = `*Trinity Prayer House*\n\nDear ${title}${m.name},\nWe wish you a very *Blessed Baptism Anniversary!*\nMay you continue to grow in the grace and knowledge of our Lord.\n\n_God Bless You!_\n\nPr Vasanth Sathyanathan`;
                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
                          }} className="p-2.5 bg-white/20 hover:bg-emerald-500 text-white rounded-xl transition-all">
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    );
                  }) : (
                    <div className="text-center py-12 px-4 bg-white/5 rounded-[2rem] border border-white/10">
                      <p className="text-2xl mb-2">{showTodayOnly ? '🌊' : '📅'}</p>
                      <p className="text-teal-100 font-bold">{showTodayOnly ? 'No baptisms today' : 'No baptisms this month'}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* --- SELECTED FAMILY VIEW --- */}
        {loading && family && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid lg:grid-cols-3 gap-8 animate-pulse">
            <div className="lg:col-span-1 space-y-6">
               <div className={`h-[350px] rounded-[2.5rem] ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
               <div className={`h-[300px] rounded-[2.5rem] ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
            </div>
            <div className="lg:col-span-2 space-y-8">
               <div className={`h-[250px] rounded-[2.5rem] ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
               <div className={`h-[400px] rounded-[2.5rem] ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-200/50'}`}></div>
            </div>
          </motion.div>
        )}

        {!loading && family && (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              {/* Profile Card */}
              <motion.div variants={fadeUp} className={`${cardBg} rounded-[2.5rem] p-8 border transition-colors duration-500 relative`}>
                {authRole === 'admin' && (
                  <div className="absolute top-6 right-6 flex items-center gap-2">
                    <motion.button whileHover={{ scale: 1.1 }} onClick={() => { setEditFam(family); setShowEditFamModal(true) }} className={`p-3 rounded-full transition-colors ${isDarkMode ? 'bg-slate-800 text-slate-300 hover:text-white' : 'bg-slate-100 text-slate-500 hover:text-slate-900'}`}><Edit3 className="w-4 h-4" /></motion.button>
                    <motion.button whileHover={{ scale: 1.1 }} onClick={handleDeleteFamily} className={`p-3 rounded-full transition-colors ${isDarkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}><Trash2 className="w-4 h-4" /></motion.button>
                  </div>
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
                        <option>Tithes</option><option>Thanksgiving</option><option>Offering</option><option>Mission</option><option>Building Fund</option><option>Missionary</option><option>Family Card</option><option>Van</option><option>VBS</option><option>Sing Song</option><option>Special Meeting</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Remarks (Optional)</label>
                      <textarea className="w-full bg-slate-800/50 rounded-2xl px-5 py-3.5 text-white border border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all font-medium text-sm" rows={2} placeholder="Add any notes..." value={remarks} onChange={e => setRemarks(e.target.value)}></textarea>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isSaving} className="flex-1 bg-blue-600 hover:bg-blue-500 font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30">{editingTxId ? (isSaving ? 'Updating...' : 'Confirm Edit') : (isSaving ? 'Processing...' : 'Save & Generate')}</motion.button>
                      {editingTxId && <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="button" onClick={() => { setEditingTxId(null); setAmount(''); setRemarks(''); setPurpose('Tithes'); }} className="px-6 bg-slate-700 hover:bg-slate-600 font-bold py-4 rounded-2xl">Cancel</motion.button>}
                    </div>
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
                      <div key={tx.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all ${isDarkMode ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/80' : 'bg-slate-50 border-slate-100 hover:shadow-md hover:bg-white'}`}>
                        <div className="mb-4 sm:mb-0">
                          <p className={`font-bold text-lg ${textPrimary}`}>{tx.purpose}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] sm:text-xs font-bold px-2 py-1 rounded-md ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{tx.receipt_number}</span>
                            <span className={`text-[10px] sm:text-xs font-bold ${textSecondary}`}>{new Date(tx.payment_date).toLocaleDateString()}</span>
                          </div>
                          {tx.remarks && <p className={`text-xs mt-2 italic ${textSecondary}`}>📝 {tx.remarks}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 sm:mt-0">
                          <span className="text-xl sm:text-2xl font-extrabold text-emerald-500 mr-2 sm:mr-3">₹{tx.amount.toLocaleString()}</span>
                          <button onClick={() => { setAmount(tx.amount.toString()); setPurpose(tx.purpose); setRemarks(tx.remarks || ''); setEditingTxId(tx.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="Edit Receipt"><Edit3 className="w-5 h-5" /></button>
                          <button onClick={() => handleDeleteReceipt(tx.id)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-red-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title="Delete Receipt"><Trash2 className="w-5 h-5" /></button>
                          <button onClick={() => sendWhatsApp(tx, family, logoBase64)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-emerald-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'}`} title="Send WhatsApp with PDF"><MessageCircle className="w-5 h-5" /></button>
                          <button onClick={() => downloadPDF(tx, family, logoBase64)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-purple-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-purple-500 hover:bg-purple-50'}`} title="Download PDF"><Download className="w-5 h-5" /></button>
                          <button onClick={() => printReceipt(tx, family)} className={`p-3 rounded-xl border transition-colors ${isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-blue-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`} title="Print Receipt"><Printer className="w-5 h-5" /></button>
                        </div>
                      </div>
                    ))}
                    {transactions.length === 0 && <div className={`text-center py-10 font-medium ${textSecondary} bg-slate-500/5 rounded-2xl border border-slate-500/10 border-dashed`}>No receipts generated yet.</div>}
                  </div>
                </motion.div>
              )}

              {/* Members Table */}
              <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 border transition-colors duration-500`}>
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
                        <tr key={m.id} className={`group border-b ${isDarkMode ? 'border-slate-800 hover:bg-slate-800/50' : 'border-slate-100 hover:bg-slate-50'} transition-colors`}>
                          <td className="py-4 px-3">
                            <div className="flex items-center gap-4">
                              <img loading="lazy" src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff&rounded=true`} className="w-10 h-10 shadow-sm" alt="avatar"/>
                              <span className={`text-base font-bold ${textPrimary}`}>{m.name}</span>
                            </div>
                          </td>
                          <td className={`py-4 px-3 ${textSecondary}`}>{m.relationship || '-'}</td><td className={`py-4 px-3 ${textSecondary}`}>{m.birth_date ? `${m.birth_date}${calculateAge(m.birth_date)}` : '-'}</td>
                          {authRole === 'admin' && (
                            <td className="py-4 px-3 text-right">
                              <div className="flex justify-end items-center gap-1">
                                <button onClick={() => { setEditDependent(m); setShowEditDependentModal(true) }} className="p-2 text-slate-400 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteMember(m.id, m.name)} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div> 
              </motion.div>
            </div>
          </motion.div>
        )}



        {/* --- MODALS --- */}
        <AnimatePresence>
          {showAddModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-start justify-center p-2 sm:p-4 pt-10 sm:pt-20 overflow-y-auto">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className={`rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-2xl shadow-2xl relative my-8 border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}>
                <button onClick={() => setShowAddModal(false)} className="absolute top-6 right-6 p-3 rounded-full hover:bg-slate-500/10 text-slate-400 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-3xl font-extrabold mb-8">Register New Family</h2>
                <form onSubmit={handleAddFamily} className="space-y-8">
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest border-b border-slate-500/20 pb-3">Primary Contact Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Head of Family Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.head_name} onChange={e => setNewFam({...newFam, head_name: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Mobile Number</label><input type="tel" pattern="[0-9]{10}" maxLength={10} placeholder="10-digit number" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.mobile} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setNewFam({...newFam, mobile: v}); }} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Email Address</label><input type="email" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.email} onChange={e => setNewFam({...newFam, email: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">City / Place</label><input type="text" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.place} onChange={e => setNewFam({...newFam, place: e.target.value})} /></div>
                      <div className="sm:col-span-2"><label className="text-sm font-bold block mb-2 text-slate-500">Full Address</label><textarea className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.address} onChange={e => setNewFam({...newFam, address: e.target.value})} rows={2}></textarea></div>
                    </div>
                  </div>
                  <div className="space-y-5">
                    <h3 className="text-xs font-bold text-pink-500 uppercase tracking-widest border-b border-slate-500/20 pb-3">Head Personal Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium transition-all appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.gender} onChange={e => setNewFam({...newFam, gender: e.target.value})}><option value="">Select Gender</option><option>Male</option><option>Female</option></select></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.birth_date} onChange={e => setNewFam({...newFam, birth_date: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Baptism Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.baptism_date} onChange={e => setNewFam({...newFam, baptism_date: e.target.value})} /></div>
                      <div><label className="text-sm font-bold block mb-2 text-slate-500">Marriage Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newFam.marriage_date} onChange={e => setNewFam({...newFam, marriage_date: e.target.value})} /></div>
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
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-start justify-center p-2 sm:p-4 pt-10 sm:pt-20 overflow-y-auto">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative my-8 border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}>
                <button onClick={() => setShowAddMemberModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-2xl font-extrabold mb-8">Add Dependent</h2>
                <form onSubmit={handleAddMember} className="space-y-5">
                  <div><label className="text-sm font-bold block mb-2 text-slate-500">Full Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Relation</label><input type="text" placeholder="e.g. Son" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.relationship} onChange={e => setNewMember({...newMember, relationship: e.target.value})} /></div>
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.gender} onChange={e => setNewMember({...newMember, gender: e.target.value})}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
                  </div>
                  <div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.birth_date} onChange={e => setNewMember({...newMember, birth_date: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Baptism Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.baptism_date} onChange={e => setNewMember({...newMember, baptism_date: e.target.value})} /></div>
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Marriage Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={newMember.marriage_date} onChange={e => setNewMember({...newMember, marriage_date: e.target.value})} /></div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl mt-4 shadow-xl shadow-blue-500/30 text-lg transition-all">{isWorking ? 'Adding...' : 'Add Member'}</motion.button>
                </form>
              </motion.div>
            </div>
          )}

          {showEditDependentModal && editDependent && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-start justify-center p-2 sm:p-4 pt-10 sm:pt-20 overflow-y-auto">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative my-8 border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}>
                <button onClick={() => setShowEditDependentModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"><X className="w-6 h-6" /></button>
                <h2 className="text-2xl font-extrabold mb-8">Edit Dependent</h2>
                <form onSubmit={handleEditDependent} className="space-y-5">
                  <div><label className="text-sm font-bold block mb-2 text-slate-500">Full Name *</label><input type="text" required className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.name} onChange={e => setEditDependent({...editDependent, name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Relation</label><input type="text" placeholder="e.g. Son" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.relationship} onChange={e => setEditDependent({...editDependent, relationship: e.target.value})} /></div>
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Gender</label><select className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 appearance-none ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.gender} onChange={e => setEditDependent({...editDependent, gender: e.target.value})}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
                  </div>
                  <div><label className="text-sm font-bold block mb-2 text-slate-500">Date of Birth</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.birth_date} onChange={e => setEditDependent({...editDependent, birth_date: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-5">
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Baptism Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.baptism_date} onChange={e => setEditDependent({...editDependent, baptism_date: e.target.value})} /></div>
                    <div><label className="text-sm font-bold block mb-2 text-slate-500">Marriage Date</label><input type="date" className={`w-full border rounded-2xl px-5 py-3 outline-none font-medium focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} value={editDependent.marriage_date} onChange={e => setEditDependent({...editDependent, marriage_date: e.target.value})} /></div>
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={isWorking} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-4 rounded-2xl mt-4 shadow-xl shadow-blue-500/30 text-lg transition-all">{isWorking ? 'Updating...' : 'Update Member'}</motion.button>
                </form>
              </motion.div>
            </div>
          )}

          {showBroadcastModal && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className={`rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl relative border ${isDarkMode ? 'bg-slate-900 text-white border-slate-800' : 'bg-white text-slate-900 border-white'}`}>
                <button onClick={() => { setShowBroadcastModal(false); setIsBroadcasting(false); }} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
                
                <h2 className="text-2xl font-extrabold mb-2 flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl"><Megaphone className="w-6 h-6 text-orange-500"/></div> 
                  Broadcast
                </h2>
                
                {!isBroadcasting ? (
                  <>
                    <p className={`text-sm mb-8 font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Send an announcement to all {stats.families} families.</p>
                    <div className="space-y-5">
                      <div>
                        <textarea className={`w-full border rounded-2xl px-5 py-4 focus:ring-2 focus:ring-orange-500 outline-none font-medium transition-all ${isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`} rows={4} placeholder="Type your announcement here..." value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)}></textarea>
                      </div>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleBroadcast} disabled={!broadcastMsg || isWorking} className="w-full bg-orange-500 hover:bg-orange-400 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-500/30 text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isWorking ? 'Preparing...' : <><MessageCircle className="w-6 h-6"/> Start Broadcast Session</>}
                      </motion.button>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 space-y-6">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">
                      <span>Progress</span>
                      <span>{broadcastIndex + 1} / {broadcastList.length}</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${((broadcastIndex + 1) / broadcastList.length) * 100}%` }} className="bg-orange-500 h-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></motion.div>
                    </div>
                    
                    <div className={`p-6 rounded-[2rem] border ${isDarkMode ? 'bg-slate-950/50 border-slate-800' : 'bg-slate-50 border-slate-200'} text-center`}>
                      <p className={`text-[10px] font-extrabold ${textSecondary} mb-2 uppercase tracking-[0.2em]`}>Next Recipient</p>
                      <p className={`text-2xl font-black ${textPrimary} tracking-tight`}>{broadcastList[broadcastIndex]?.head_name}</p>
                      <p className={`text-sm font-bold text-orange-500 mt-1`}>{broadcastList[broadcastIndex]?.mobile}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => {
                        if (broadcastIndex < broadcastList.length - 1) setBroadcastIndex(broadcastIndex + 1)
                        else { setIsBroadcasting(false); setShowBroadcastModal(false); }
                      }} className={`py-4 rounded-2xl font-bold transition-all ${isDarkMode ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Skip</button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => sendIndividualBroadcast(broadcastList[broadcastIndex])} className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-xl shadow-orange-600/30">Send & Next</motion.button>
                    </div>
                    
                    <p className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-wider">Note: This will open WhatsApp in a new tab</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AIChatBot />
    </DashboardShell>
  )
}
