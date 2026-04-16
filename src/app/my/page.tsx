'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import ConfessionCard from '@/components/confession/ConfessionCard';
import PotionButton from '@/components/ui/PotionButton';
import { cn } from '@/lib/utils';

type Filter = 'all' | 'minted' | 'not-minted';

export default function MyExpressionsPage() {
  const { myExpressions, identity, wallet, deleteExpression, hideExpression, refreshMine } = useApp();
  const [filter, setFilter] = useState<Filter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hidingId, setHidingId] = useState<string | null>(null);
  const [hideError, setHideError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  // Refetch when identity becomes available (the stealth address is the
  // primary "who am I" in the anonymous flow — main wallet is only used
  // to show legacy records).
  useEffect(() => {
    if (mounted) refreshMine();
  }, [mounted, identity.stealthAddress, wallet.fullAddress, refreshMine]);

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
    try {
      await deleteExpression(id);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleHide(id: string, nextHidden: boolean) {
    setHidingId(id);
    setHideError(null);
    try {
      await hideExpression(id, nextHidden);
    } catch (err) {
      setHideError(`${(err as Error).message} (${id})`);
    } finally {
      setHidingId(null);
    }
  }

  // ─── Gates ─────────────────────────────────────────────
  //
  // We show content when the user has either a Semaphore identity (new flow)
  // or a connected wallet (legacy data). Only when both are missing do we
  // ask the user to take action.

  if (!mounted) {
    return null;
  }

  if (!identity.identity && !wallet.connected) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="font-pixel text-[10px] text-gray-400 mb-4">
            To see your spirits, either set up your anonymous identity or connect the wallet you used before.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <PotionButton variant="violet" onClick={() => router.push('/join')}>
              ✦ Set up identity
            </PotionButton>
            <PotionButton variant="cyan" small onClick={wallet.connect}>
              Connect Wallet (legacy)
            </PotionButton>
          </div>
        </div>
      </div>
    );
  }

  const stealth = identity.stealthAddress;
  const shortStealth = stealth ? `${stealth.slice(0, 6)}…${stealth.slice(-4)}` : null;

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
              ✦ My Spirits
            </h1>
            <div className="font-pixel text-[8px] text-gray-500 space-y-1">
              {stealth && (
                <div>
                  stealth owner:{' '}
                  <span className="text-wizard-cyan/80" title={stealth}>{shortStealth}</span>
                </div>
              )}
              {wallet.fullAddress && (
                <div className="text-gray-600">
                  legacy wallet: {wallet.address}
                </div>
              )}
            </div>
          </div>
          <Link href="/create">
            <PotionButton variant="cyan" small>+ New Wizper</PotionButton>
          </Link>
        </div>

        {hideError && (
          <div className="mb-4 border border-wizard-ember/40 bg-wizard-ember/10 p-2 font-pixel text-[9px] text-wizard-ember break-all">
            {hideError}
          </div>
        )}

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
            <div
              key={expression.id}
              className={cn('relative group', expression.hidden && 'opacity-60')}
            >
              <ConfessionCard confession={expression} index={i} />

              <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!expression.minted && (
                  <button
                    onClick={() => handleDelete(expression.id)}
                    disabled={deletingId === expression.id}
                    className="font-pixel text-[7px] bg-red-900/80 text-red-300 border border-red-700/50 px-2 py-1 hover:bg-red-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {deletingId === expression.id ? '…' : 'Delete'}
                  </button>
                )}
                {expression.minted && (
                  <button
                    onClick={() => handleHide(expression.id, !expression.hidden)}
                    disabled={hidingId === expression.id}
                    className="font-pixel text-[7px] bg-gray-900/80 text-gray-400 border border-gray-700/50 px-2 py-1 hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {hidingId === expression.id ? '…' : expression.hidden ? 'Unhide' : 'Hide'}
                  </button>
                )}
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
              No spirits yet — your first one is waiting to be born.
            </p>
            <Link href="/create">
              <PotionButton variant="violet">✦ Create Your First Spirit</PotionButton>
            </Link>
          </div>
        )}

        {myExpressions.length > 0 && (
          <div className="mt-8 border border-wizard-violet/10 bg-wizard-violet/5 p-4">
            <p className="font-pixel text-[8px] text-gray-500 mb-2">Hover a card to:</p>
            <div className="flex gap-4 flex-wrap">
              <span className="font-pixel text-[7px] text-red-400">Delete — remove un-minted drafts</span>
              <span className="font-pixel text-[7px] text-gray-400">Hide — hide from public feed (NFT stays on-chain)</span>
              <span className="font-pixel text-[7px] text-wizard-violet">View — open detail page</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
