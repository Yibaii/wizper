'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import ConfessionCard from '@/components/confession/ConfessionCard';
import PotionButton from '@/components/ui/PotionButton';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'minted' | 'recent';

export default function FeedPage() {
  const { feedExpressions } = useApp();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = (() => {
    switch (filter) {
      case 'minted':
        return feedExpressions.filter(c => c.minted);
      case 'recent':
        return [...feedExpressions].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ).slice(0, 6);
      default:
        return feedExpressions;
    }
  })();

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'minted', label: 'Minted' },
    { key: 'recent', label: 'Recent' },
  ];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] px-4 py-10 max-w-6xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="font-pixel text-lg text-wizard-cyan text-glow-cyan mb-1">
              ✦ Wizard Square
            </h1>
            <p className="font-pixel text-[8px] text-gray-500">
              Emotion Feed — Every wizard carries an anonymous voice
            </p>
          </div>
          <Link href="/create">
            <PotionButton variant="violet" small>
              + New Confession
            </PotionButton>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'font-pixel text-[8px] px-3 py-1.5 border transition-all cursor-pointer',
                filter === f.key
                  ? 'border-wizard-cyan text-wizard-cyan bg-wizard-cyan/10'
                  : 'border-wizard-violet/30 text-gray-500 hover:border-wizard-violet/60',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((confession, i) => (
            <ConfessionCard key={confession.id} confession={confession} index={i} />
          ))}
        </div>

        {feedExpressions.length === 0 && (
          <div className="text-center py-20">
            <p className="font-pixel text-[10px] text-gray-600 mb-4">
              No spirits here yet…
            </p>
            <p className="font-pixel text-[8px] text-gray-700">
              Mint your first expression to appear in the feed
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
