'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronRight, User, Users, X } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import type { Family, SearchResult } from '@/utils/types'

type Props = {
  onSelectFamily: (family: Family) => void;
};

export default function SearchEngine({ onSelectFamily }: Props) {
  const { isDarkMode, textPrimary, textSecondary } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.trim().length > 1) {
        setIsSearching(true);
        try {
          const searchResults: SearchResult[] = [];
          let searchId = searchTerm.trim();
          if (/^\d+$/.test(searchId)) searchId = `TPH-MDK-${searchId.padStart(5, '0')}`;

          // 1. Search members by name — get their family details too
          const { data: memberMatches } = await supabase
            .from('members')
            .select('id, name, relationship, family_id, families(id, membership_id, head_name, address, place, mobile, email, join_date)')
            .ilike('name', `%${searchTerm}%`)
            .limit(15);

          const memberFamilyIds = new Set<string>();

          if (memberMatches) {
            memberMatches.forEach(m => {
              const fam = m.families as unknown as Family;
              if (fam) {
                memberFamilyIds.add(fam.id);
                searchResults.push({
                  type: 'member',
                  family: fam,
                  memberName: m.name,
                  memberRelationship: m.relationship || 'Member',
                });
              }
            });
          }

          // 2. Search families by head_name or membership_id
          const { data: familyMatches } = await supabase
            .from('families')
            .select('*')
            .or(`membership_id.ilike.%${searchId}%,head_name.ilike.%${searchTerm}%`)
            .limit(10);

          if (familyMatches) {
            familyMatches.forEach(f => {
              // Avoid duplicates — if this family already appeared via a member match, skip
              if (!memberFamilyIds.has(f.id)) {
                searchResults.push({
                  type: 'family',
                  family: f,
                });
              }
            });
          }

          setResults(searchResults);
          setShowResults(true);
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSelect = (result: SearchResult) => {
    onSelectFamily(result.family);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className="relative w-full sm:w-[420px]">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search members, families, or ID..."
          className={`w-full pl-12 pr-10 py-3.5 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300 ${
            isDarkMode
              ? 'bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-500 focus:bg-slate-950'
              : 'bg-slate-100/50 border border-transparent text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-slate-200 focus:shadow-lg'
          }`}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => { if (results.length > 0) setShowResults(true); }}
        />
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`} />
        
        {searchTerm && (
          <button
            onClick={() => { setSearchTerm(''); setResults([]); setShowResults(false); }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-500/10 transition-colors ${textSecondary}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        
        {isSearching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showResults && results.length > 0 && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl shadow-2xl overflow-hidden z-50 border backdrop-blur-xl max-h-[420px] overflow-y-auto ${
              isDarkMode
                ? 'bg-slate-900/95 border-slate-700 shadow-black/50'
                : 'bg-white/95 border-slate-100 shadow-slate-300/50'
            }`}
          >
            {/* Results count */}
            <div className={`px-5 py-3 text-[10px] font-extrabold uppercase tracking-[0.15em] border-b ${
              isDarkMode ? 'text-slate-500 border-slate-800 bg-slate-950/50' : 'text-slate-400 border-slate-100 bg-slate-50/80'
            }`}>
              {results.length} result{results.length !== 1 ? 's' : ''} found
            </div>

            {results.map((result, idx) => (
              <div
                key={`${result.type}-${result.family.id}-${result.memberName || ''}-${idx}`}
                onClick={() => handleSelect(result)}
                className={`px-5 py-4 cursor-pointer flex items-center gap-4 transition-all group ${
                  isDarkMode
                    ? 'hover:bg-slate-800/80 border-b border-slate-800/50'
                    : 'hover:bg-blue-50/50 border-b border-slate-50'
                } last:border-0`}
              >
                {/* Icon based on result type */}
                {result.type === 'member' ? (
                  <div className="relative shrink-0">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(result.memberName || '')}&background=random&color=fff&rounded=true`}
                      className="w-11 h-11 shadow-sm"
                      alt="avatar"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      <User className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                ) : (
                  <div className="relative shrink-0">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(result.family.head_name)}&background=random&color=fff&rounded=true`}
                      className="w-11 h-11 shadow-sm"
                      alt="avatar"
                    />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      <Users className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  {result.type === 'member' ? (
                    <>
                      <p className={`font-bold text-sm leading-tight truncate ${textPrimary}`}>
                        {result.memberName}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isDarkMode ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {result.memberRelationship}
                        </span>
                        <span className={`text-xs font-medium ${textSecondary} truncate`}>
                          {result.family.head_name}&apos;s Family
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className={`font-bold text-sm leading-tight truncate ${textPrimary}`}>
                        {result.family.head_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Family Head
                        </span>
                        <span className={`text-xs font-medium ${textSecondary}`}>
                          {result.family.membership_id}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                <ChevronRight className={`w-4 h-4 ${textSecondary} group-hover:translate-x-1 transition-transform`} />
              </div>
            ))}

            {/* Hint */}
            <div className={`px-5 py-3 text-[10px] font-bold text-center border-t ${
              isDarkMode ? 'text-slate-600 border-slate-800 bg-slate-950/30' : 'text-slate-400 border-slate-100 bg-slate-50/50'
            }`}>
              <span className={`inline-flex items-center gap-1.5`}>
                <User className="w-3 h-3 text-purple-500" /> Member
                <span className="mx-2">•</span>
                <Users className="w-3 h-3 text-blue-500" /> Family
              </span>
            </div>
          </motion.div>
        )}

        {showResults && results.length === 0 && searchTerm.length > 1 && !isSearching && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={`absolute top-[calc(100%+8px)] left-0 right-0 rounded-2xl shadow-2xl z-50 border backdrop-blur-xl p-8 text-center ${
              isDarkMode
                ? 'bg-slate-900/95 border-slate-700'
                : 'bg-white/95 border-slate-100'
            }`}
          >
            <p className="text-2xl mb-2">🔍</p>
            <p className={`font-bold text-sm ${textPrimary}`}>No results found</p>
            <p className={`text-xs mt-1 ${textSecondary}`}>Try a different name or membership ID</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
