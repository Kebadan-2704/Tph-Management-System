'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import DashboardShell from '@/components/DashboardShell'
import AnalyticsCharts from '@/components/AnalyticsCharts'
import { motion } from 'framer-motion'
import { BarChart3 } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { staggerContainer, fadeUp } from '@/utils/helpers'

export default function ReportsPage() {
  const router = useRouter();
  const { authRole, isLoading } = useAuth();
  const { textPrimary, textSecondary } = useTheme();

  useEffect(() => {
    if (!isLoading && !authRole) router.replace('/login');
  }, [authRole, isLoading, router]);

  if (isLoading || !authRole) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardShell>
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-2">
          <div>
            <h2 className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textPrimary} flex items-center gap-3`}>
              <BarChart3 className="w-7 h-7 text-blue-500" />
              Reports & Analytics
            </h2>
            <p className={`text-sm mt-1 font-medium ${textSecondary}`}>
              Financial trends, growth metrics, and contribution analytics.
            </p>
          </div>
        </motion.div>

        <AnalyticsCharts />
      </motion.div>
    </DashboardShell>
  );
}
