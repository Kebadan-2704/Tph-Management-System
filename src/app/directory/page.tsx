'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/hooks/useTheme'
import DashboardShell from '@/components/DashboardShell'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, MapPin, Phone, Filter, ChevronDown, X, ArrowUpDown, UserPlus } from 'lucide-react'
import { staggerContainer, fadeUp } from '@/utils/helpers'
import type { Family, Member } from '@/utils/types'

type FamilyWithMembers = Family & { members: Member[] };

export default function DirectoryPage() {
  const router = useRouter();
  const { authRole, isLoading } = useAuth();
  const { isDarkMode, cardBg, textPrimary, textSecondary, inputBg } = useTheme();
  const [families, setFamilies] = useState<FamilyWithMembers[]>([]);
  const [filteredFamilies, setFilteredFamilies] = useState<FamilyWithMembers[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlace, setFilterPlace] = useState('');
  const [places, setPlaces] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'name' | 'id' | 'members'>('name');
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);

  useEffect(() => {
    if (!isLoading && !authRole) router.replace('/login');
  }, [authRole, isLoading, router]);

  useEffect(() => {
    if (!authRole) return;
    loadDirectory();
  }, [authRole]);

  const loadDirectory = async () => {
    setIsLoadingData(true);
    const { data: allFamilies } = await supabase.from('families').select('*').order('head_name', { ascending: true });
    const { data: allMembers } = await supabase.from('members').select('*');
    if (allFamilies && allMembers) {
      const fwm: FamilyWithMembers[] = allFamilies.map(f => ({ ...f, members: allMembers.filter(m => m.family_id === f.id) }));
      setFamilies(fwm); setFilteredFamilies(fwm); setTotalMembers(allMembers.length);
      setPlaces([...new Set(allFamilies.map(f => f.place).filter(Boolean))].sort());
    }
    setIsLoadingData(false);
  };

  useEffect(() => {
    let result = [...families];
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      result = result.filter(f => f.head_name.toLowerCase().includes(t) || f.membership_id.toLowerCase().includes(t) || f.mobile?.toLowerCase().includes(t) || f.members.some(m => m.name.toLowerCase().includes(t)));
    }
    if (filterPlace) result = result.filter(f => f.place === filterPlace);
    if (sortBy === 'name') result.sort((a, b) => a.head_name.localeCompare(b.head_name));
    else if (sortBy === 'id') result.sort((a, b) => a.membership_id.localeCompare(b.membership_id));
    else result.sort((a, b) => b.members.length - a.members.length);
    setFilteredFamilies(result);
  }, [searchTerm, filterPlace, sortBy, families]);

  if (isLoading || !authRole) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <DashboardShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp}>
          <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textPrimary} flex items-center gap-3`}><Users className="w-7 h-7 text-purple-500" /> Member Directory</h2>
          <p className={`text-sm mt-1 font-medium ${textSecondary}`}>{families.length} families • {totalMembers} total members</p>
        </motion.div>

        <motion.div variants={fadeUp} className={`${cardBg} rounded-2xl p-4 border flex flex-col sm:flex-row gap-3 items-stretch sm:items-center`}>
          <div className="relative flex-1"><Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} /><input type="text" placeholder="Search families or members..." className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputBg}`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
          <div className="relative"><Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} /><select className={`pl-9 pr-8 py-3 rounded-xl text-sm font-semibold border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px] ${inputBg}`} value={filterPlace} onChange={e => setFilterPlace(e.target.value)}><option value="">All Places</option>{places.map(p => <option key={p} value={p}>{p}</option>)}</select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary} pointer-events-none`} /></div>
          <div className="relative"><ArrowUpDown className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${textSecondary}`} /><select className={`pl-9 pr-8 py-3 rounded-xl text-sm font-semibold border appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] ${inputBg}`} value={sortBy} onChange={e => setSortBy(e.target.value as any)}><option value="name">By Name</option><option value="id">By ID</option><option value="members">By Members</option></select><ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${textSecondary} pointer-events-none`} /></div>
          {(searchTerm || filterPlace) && <button onClick={() => { setSearchTerm(''); setFilterPlace(''); }} className="p-3 rounded-xl hover:bg-red-500/10 text-red-500"><X className="w-4 h-4" /></button>}
        </motion.div>

        <p className={`text-xs font-bold ${textSecondary} uppercase tracking-widest`}>Showing {filteredFamilies.length} of {families.length} families</p>

        {isLoadingData ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className={`${cardBg} rounded-2xl p-6 border animate-pulse`}><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-xl ${isDarkMode?'bg-slate-800':'bg-slate-200'}`}/><div className="flex-1 space-y-2"><div className={`h-4 w-32 rounded ${isDarkMode?'bg-slate-800':'bg-slate-200'}`}/><div className={`h-3 w-24 rounded ${isDarkMode?'bg-slate-800':'bg-slate-200'}`}/></div></div></div>)}</div>
        ) : filteredFamilies.length > 0 ? (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFamilies.map(fam => (
              <motion.div key={fam.id} variants={fadeUp} layout className={`${cardBg} rounded-2xl p-5 border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${expandedFamily===fam.id?'ring-2 ring-blue-500/30':''}`} onClick={() => setExpandedFamily(expandedFamily===fam.id?null:fam.id)}>
                <div className="flex items-center gap-4 mb-3">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(fam.head_name)}&background=random&color=fff&rounded=true`} className="w-12 h-12 shadow-sm shrink-0" alt="" />
                  <div className="flex-1 min-w-0"><p className={`font-bold text-sm truncate ${textPrimary}`}>{fam.head_name}</p><p className={`text-[11px] font-semibold ${textSecondary}`}>{fam.membership_id}</p></div>
                  <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${isDarkMode?'bg-blue-500/15 text-blue-400':'bg-blue-100 text-blue-700'}`}><UserPlus className="w-3 h-3 inline mr-1"/>{fam.members.length}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {fam.place && <span className={`flex items-center gap-1 font-medium ${textSecondary}`}><MapPin className="w-3 h-3"/>{fam.place}</span>}
                  {fam.mobile && <span className={`flex items-center gap-1 font-medium ${textSecondary}`}><Phone className="w-3 h-3"/>{fam.mobile}</span>}
                </div>
                <AnimatePresence>
                  {expandedFamily===fam.id && fam.members.length>0 && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                      <div className={`mt-4 pt-4 border-t space-y-2 ${isDarkMode?'border-slate-800':'border-slate-100'}`}>
                        <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-2`}>Members</p>
                        {fam.members.map(m => (
                          <div key={m.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${isDarkMode?'hover:bg-slate-800/50':'hover:bg-slate-50'}`}>
                            <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=random&color=fff&rounded=true&size=32`} className="w-8 h-8 shadow-sm shrink-0" alt="" />
                            <div className="flex-1 min-w-0"><p className={`font-semibold text-xs truncate ${textPrimary}`}>{m.name}</p><p className={`text-[10px] ${textSecondary}`}>{m.relationship||'Member'} {m.birth_date?`• ${m.birth_date}`:''}</p></div>
                            {m.gender && <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${m.gender==='Male'?isDarkMode?'bg-blue-500/15 text-blue-400':'bg-blue-100 text-blue-700':isDarkMode?'bg-pink-500/15 text-pink-400':'bg-pink-100 text-pink-700'}`}>{m.gender}</span>}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className={`${cardBg} rounded-3xl p-16 border text-center`}><p className="text-3xl mb-3">🔍</p><p className={`font-bold text-lg ${textPrimary}`}>No families found</p><p className={`text-sm mt-1 ${textSecondary}`}>Try adjusting your search or filters</p></div>
        )}
      </motion.div>
    </DashboardShell>
  );
}
