'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import PotionButton from '@/components/ui/PotionButton';
import WizardCharacter from '@/components/confession/WizardCharacter';

export default function HomePage() {
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
