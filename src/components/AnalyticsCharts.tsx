'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/utils/supabase'
import { useTheme } from '@/hooks/useTheme'
import { motion } from 'framer-motion'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend, XAxis, YAxis, CartesianGrid 
} from 'recharts'
import { TrendingUp, TrendingDown, Calendar, DollarSign, Users, UserPlus } from 'lucide-react'
import { CHART_COLORS, fadeUp, scaleIn } from '@/utils/helpers'
import type { Transaction } from '@/utils/types'

type MonthlyData = { month: string; total: number; count: number };
type PurposeData = { name: string; value: number };
type GrowthData = { month: string; families: number; members: number };

type Props = {
  className?: string;
}

export default function AnalyticsCharts({ className = '' }: Props) {
  const { isDarkMode, cardBg, textPrimary, textSecondary } = useTheme();
  
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyData[]>([]);
  const [purposeBreakdown, setPurposeBreakdown] = useState<PurposeData[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [yoyData, setYoyData] = useState<{ month: string; thisYear: number; lastYear: number }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all transactions
      const { data: allTx } = await supabase
        .from('transactions')
        .select('amount, purpose, payment_date')
        .order('payment_date', { ascending: true });

      // Fetch families with join dates
      const { data: allFamilies } = await supabase
        .from('families')
        .select('id, join_date')
        .order('join_date', { ascending: true });

      // Fetch members count per month (by id, approximation)
      const { data: allMembers } = await supabase
        .from('members')
        .select('id, family_id');

      if (allTx) {
        // Total revenue
        const total = allTx.reduce((s, t) => s + Number(t.amount), 0);
        setTotalRevenue(total);

        // Monthly trends - last 12 months
        const now = new Date();
        const monthlyMap: Record<string, { total: number; count: number }> = {};
        const months = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          monthlyMap[key] = { total: 0, count: 0 };
          months.push({ key, label });
        }

        allTx.forEach(tx => {
          const d = new Date(tx.payment_date);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (monthlyMap[key]) {
            monthlyMap[key].total += Number(tx.amount);
            monthlyMap[key].count += 1;
          }
        });

        const trends = months.map(m => ({
          month: m.label,
          total: monthlyMap[m.key].total,
          count: monthlyMap[m.key].count,
        }));
        setMonthlyTrends(trends);

        // Monthly change
        if (trends.length >= 2) {
          const current = trends[trends.length - 1].total;
          const previous = trends[trends.length - 2].total;
          if (previous > 0) {
            setMonthlyChange(Math.round(((current - previous) / previous) * 100));
          }
        }

        // Purpose breakdown
        const purposeMap: Record<string, number> = {};
        allTx.forEach(tx => {
          purposeMap[tx.purpose] = (purposeMap[tx.purpose] || 0) + Number(tx.amount);
        });
        setPurposeBreakdown(
          Object.entries(purposeMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
        );

        // Year-over-year comparison
        const thisYear = now.getFullYear();
        const yoyMap: { month: string; thisYear: number; lastYear: number }[] = [];
        for (let m = 0; m < 12; m++) {
          const monthLabel = new Date(thisYear, m, 1).toLocaleString('default', { month: 'short' });
          let thisYearTotal = 0;
          let lastYearTotal = 0;
          allTx.forEach(tx => {
            const d = new Date(tx.payment_date);
            if (d.getMonth() === m) {
              if (d.getFullYear() === thisYear) thisYearTotal += Number(tx.amount);
              else if (d.getFullYear() === thisYear - 1) lastYearTotal += Number(tx.amount);
            }
          });
          yoyMap.push({ month: monthLabel, thisYear: thisYearTotal, lastYear: lastYearTotal });
        }
        setYoyData(yoyMap);
      }

      // Member growth - approximate by family count accumulation
      if (allFamilies) {
        const now = new Date();
        const growthMonths: GrowthData[] = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
          const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
          
          // Count families created by end of this month
          const famCount = allFamilies.filter(f => {
            if (!f.join_date) return true; // count families without join date
            return new Date(f.join_date) <= endOfMonth;
          }).length;
          
          // Approximate member count based on family ratio
          const memberRatio = allMembers ? allMembers.length / Math.max(allFamilies.length, 1) : 3;
          
          growthMonths.push({
            month: label,
            families: famCount,
            members: Math.round(famCount * memberRatio),
          });
        }
        setGrowthData(growthMonths);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const tooltipStyle = {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    borderRadius: '16px',
    border: isDarkMode ? '1px solid #1e293b' : '1px solid #e2e8f0',
    color: isDarkMode ? '#f8fafc' : '#0f172a',
    padding: '12px 20px',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
    fontSize: '13px',
    fontWeight: '600',
  };

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {[1, 2, 3].map(i => (
          <div key={i} className={`${cardBg} rounded-3xl p-8 border animate-pulse`}>
            <div className={`h-6 w-48 rounded-lg mb-6 ${isDarkMode ? 'bg-slate-800' : 'bg-slate-200'}`} />
            <div className={`h-64 rounded-2xl ${isDarkMode ? 'bg-slate-800/50' : 'bg-slate-100'}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div variants={fadeUp} className={`${cardBg} rounded-2xl p-5 border flex items-center gap-4`}>
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-0.5`}>Total Revenue</p>
            <p className={`text-2xl font-extrabold tracking-tight ${textPrimary}`}>₹{totalRevenue.toLocaleString('en-IN')}</p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className={`${cardBg} rounded-2xl p-5 border flex items-center gap-4`}>
          <div className={`w-12 h-12 ${monthlyChange >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} rounded-xl flex items-center justify-center`}>
            {monthlyChange >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-500" /> : <TrendingDown className="w-6 h-6 text-red-500" />}
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-0.5`}>Monthly Change</p>
            <p className={`text-2xl font-extrabold tracking-tight ${monthlyChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {monthlyChange >= 0 ? '+' : ''}{monthlyChange}%
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className={`${cardBg} rounded-2xl p-5 border flex items-center gap-4`}>
          <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
            <Calendar className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest ${textSecondary} mb-0.5`}>This Month</p>
            <p className={`text-2xl font-extrabold tracking-tight ${textPrimary}`}>
              ₹{(monthlyTrends[monthlyTrends.length - 1]?.total || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Monthly Contribution Trends */}
      <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
        <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
          <TrendingUp className="w-5 h-5 text-blue-500" />
          Monthly Contribution Trends
        </h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyTrends}>
              <defs>
                <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: any) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
              <Area type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={3} fill="url(#gradBlue)" dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Purpose Breakdown */}
        <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
            <DollarSign className="w-5 h-5 text-purple-500" />
            Giving by Purpose
          </h3>
          {purposeBreakdown.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={purposeBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={6} dataKey="value" stroke="none">
                    {purposeBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} style={{ filter: `drop-shadow(0px 8px 10px ${CHART_COLORS[index % CHART_COLORS.length]}30)` }} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: '600' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className={`h-[280px] flex items-center justify-center text-sm font-medium ${textSecondary}`}>
              No transaction data yet.
            </div>
          )}
        </motion.div>

        {/* Year-over-Year Comparison */}
        <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
          <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
            <Calendar className="w-5 h-5 text-amber-500" />
            Year-over-Year
          </h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yoyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(value: any) => `₹${Number(value).toLocaleString('en-IN')}`} />
                <Bar dataKey="lastYear" name="Last Year" fill={isDarkMode ? '#334155' : '#cbd5e1'} radius={[6, 6, 0, 0]} barSize={16} />
                <Bar dataKey="thisYear" name="This Year" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: '600' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Member Growth */}
      <motion.div variants={scaleIn} className={`${cardBg} rounded-3xl p-6 sm:p-8 border`}>
        <h3 className={`text-lg font-bold mb-6 flex items-center gap-3 ${textPrimary}`}>
          <UserPlus className="w-5 h-5 text-emerald-500" />
          Congregation Growth
        </h3>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#e2e8f0'} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: isDarkMode ? '#64748b' : '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="families" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }} name="Families" />
              <Line type="monotone" dataKey="members" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }} name="Members" />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '12px', fontWeight: '600' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
