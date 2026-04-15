'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import ConfessionCard from '@/components/confession/ConfessionCard';
import PotionButton from '@/components/ui/PotionButton';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'minted' | 'not-minted';

export default function MyExpressionsPage() {
  const { myExpressions, wallet, deleteExpression, hideExpression } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = (() => {
    switch (filter) {
      case 'minted':     return myExpressions.filter(c => c.minted);
      case 'not-minted': return myExpressions.filter(c => !c.minted);
      default:           return myExpressions;
    }
  })();

  const filters: { key: Filter; label: string }[] = [
    { key: 'all',       label: `All (${myExpressions.length})` },
    { key: 'minted',    label: `Minted (${myExpressions.filter(c => c.minted).length})` },
    { key: 'not-minted',label: `Not Minted (${myExpressions.filter(c => !c.minted).length})` },
  ];

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteExpression(id);
    setDeletingId(null);
  }

  async function handleHide(id: string) {
    await hideExpression(id);
  }

  if (!wallet.connected) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="text-center">
          <p className="font-pixel text-[10px] text-gray-500 mb-4">
            Connect your wallet to see your expressions
          </p>
          <PotionButton variant="violet" onClick={wallet.connect}>
            Connect Wallet
          </PotionButton>
        </div>
      </div>
    );
  }

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
            <h1 className="font-pixel text-lg text-wizard-violet text-glow-violet mb-1">
              ✦ My Expressions
            </h1>
            <p className="font-pixel text-[8px] text-gray-500">
              {wallet.address} — your personal wizper collection
            </p>
          </div>
          <Link href="/create">
            <PotionButton variant="cyan" small>+ New Wizper</PotionButton>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                'font-pixel text-[8px] px-3 py-1.5 border transition-all cursor-pointer',
                filter === f.key
                  ? 'border-wizard-violet text-wizard-violet bg-wizard-violet/10'
                  : 'border-wizard-violet/30 text-gray-500 hover:border-wizard-violet/60',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((expression, i) => (
            <div key={expression.id} className="relative group">
              <ConfessionCard confession={expression} index={i} />

              {/* Action overlay */}
              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Un-minted: can delete */}
                {!expression.minted && (
                  <button
                    onClick={() => handleDelete(expression.id)}
                    disabled={deletingId === expression.id}
                    className="font-pixel text-[7px] bg-red-900/80 text-red-300 border border-red-700/50 px-2 py-1 hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === expression.id ? '…' : 'Delete'}
                  </button>
                )}
                {/* Minted: can hide from feed */}
                {expression.minted && (
                  <button
                    onClick={() => handleHide(expression.id)}
                    className="font-pixel text-[7px] bg-gray-900/80 text-gray-400 border border-gray-700/50 px-2 py-1 hover:bg-gray-800 transition-colors cursor-pointer"
                  >
                    Hide
                  </button>
                )}
                {/* View detail */}
                <button
                  onClick={() => router.push(`/confession/${expression.id}`)}
                  className="font-pixel text-[7px] bg-wizard-violet/20 text-wizard-violet border border-wizard-violet/30 px-2 py-1 hover:bg-wizard-violet/30 transition-colors cursor-pointer"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>

        {myExpressions.length === 0 && (
          <div className="text-center py-20">
            <p className="font-pixel text-[10px] text-gray-600 mb-4">
              You haven&apos;t created any expressions yet
            </p>
            <Link href="/create">
              <PotionButton variant="violet">✦ Create Your First Expression</PotionButton>
            </Link>
          </div>
        )}

        {/* Legend */}
        {myExpressions.length > 0 && (
          <div className="mt-8 border border-wizard-violet/10 bg-wizard-violet/5 p-4">
            <p className="font-pixel text-[8px] text-gray-500 mb-2">Hover a card to:</p>
            <div className="flex gap-4 flex-wrap">
              <span className="font-pixel text-[7px] text-red-400">Delete — remove un-minted expressions</span>
              <span className="font-pixel text-[7px] text-gray-400">Hide — hide minted from public feed (still on-chain)</span>
              <span className="font-pixel text-[7px] text-wizard-violet">View — open detail page</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
