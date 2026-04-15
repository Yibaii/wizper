'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import PotionButton from '@/components/ui/PotionButton';
import WizardCharacter from '@/components/confession/WizardCharacter';
import { useApp } from '@/context/AppContext';

export default function HomePage() {
  const { wallet, claimDailyReward } = useApp();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState('');

  async function handleClaim() {
    if (!wallet.connected) {
      wallet.connect();
      return;
    }
    setClaiming(true);
    setClaimError('');
    try {
      await claimDailyReward();
      setClaimed(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Claim once per day')) {
        setClaimError('Already claimed today, come back tomorrow!');
      } else {
        setClaimError('Claim failed');
      }
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Hero content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        {/* Hero Wizard */}
        <motion.div
          className="mb-6"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          <WizardCharacter text="Wizper Hero Wizard" size={180} />
        </motion.div>

        {/* Title */}
        <h1 className="font-pixel text-2xl md:text-3xl text-wizard-cyan text-glow-cyan mb-3 leading-relaxed">
          Wizper
        </h1>
        <h2 className="font-pixel text-xs md:text-sm text-wizard-violet mb-8">
          Where Emotions Become Spirits
        </h2>

        {/* Tagline */}
        <p className="text-sm md:text-base text-gray-400 mb-2 max-w-md leading-relaxed">
          Your emotions and whisper become wizards, drifting freely in the enchanted forest.
        </p>
        <p className="text-xs text-gray-500 mb-10 max-w-md">
           Anonymous. Expressive. Yours.
        </p>

        {/* CTA */}
        <Link href="/create">
          <PotionButton variant="cyan">
            ✦ Reveal Your Thought
          </PotionButton>
        </Link>

        {/* Daily Reward */}
        <motion.div
          className="mt-10 border border-wizard-gold/20 bg-wizard-gold/5 px-6 py-4 w-full max-w-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-pixel text-[9px] text-wizard-gold mb-1">✦ Daily Reward</p>
              <p className="font-pixel text-[7px] text-gray-500">
                Claim 6 $WIZPER every 24h
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={claiming || claimed}
              className="font-pixel text-[8px] px-4 py-2 border transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-wizard-gold/40 text-wizard-gold hover:bg-wizard-gold/10"
            >
              {claiming ? '✦ Claiming…' : claimed ? '✦ Claimed!' : '✦ Claim'}
            </button>
          </div>
          {claimError && (
            <p className="font-pixel text-[7px] text-red-400 mt-2">{claimError}</p>
          )}
          {claimed && (
            <p className="font-pixel text-[7px] text-wizard-green mt-2">+6 $WIZPER added to your wallet!</p>
          )}
        </motion.div>

        {/* Sub-links */}
        <div className="flex gap-6 mt-8">
          <Link
            href="/feed"
            className="font-pixel text-[9px] text-gray-500 hover:text-wizard-violet transition-colors"
          >
            ✦ Explore Feed
          </Link>
          <Link
            href="/connections"
            className="font-pixel text-[9px] text-gray-500 hover:text-wizard-green transition-colors"
          >
            ✦ Connections
          </Link>
        </div>

        {/* Privacy note */}
        <motion.div
          className="mt-12 flex items-center gap-2 text-wizard-green font-pixel text-[8px] opacity-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          transition={{ delay: 1 }}
        >
          <span>🛡️</span>
          <span>Identity protected via Zero-Knowledge Proofs</span>
        </motion.div>
      </motion.div>
    </div>
  );
}
