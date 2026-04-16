'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import WizardCharacter from './WizardCharacter';
import MintBadge from '@/components/ui/MintBadge';
import { truncate } from '@/lib/utils';
import { EMOTION_LABELS } from '@/lib/emotions';
import type { Confession } from '@/data/mock';

interface Props {
  confession: Confession;
  index?: number;
}

export default function ConfessionCard({ confession, index = 0 }: Props) {
  return (
    <Link href={`/confession/${confession.id}`}>
      <motion.div
        className="group relative border border-wizard-violet/30 bg-wizard-purple/40 p-4 backdrop-blur-sm transition-all hover:border-wizard-violet/60 hover:bg-wizard-purple/60 cursor-pointer"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06, duration: 0.4 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
        {/* Glow on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-[inset_0_0_30px_#b24bf315]" />

        {/* Character */}
        <div className="flex justify-center mb-3">
          <WizardCharacter text={confession.text} size={80} />
        </div>

        {/* Emotion tag */}
        <div className="flex items-center gap-1 mb-2">
          <span className="text-[10px]">
            {EMOTION_LABELS[confession.emotion]?.icon ?? EMOTION_LABELS.confusion.icon}
          </span>
          <span className="font-pixel text-[7px] text-wizard-cyan/70">
            {EMOTION_LABELS[confession.emotion]?.en ?? confession.emotion}
          </span>
        </div>

        {/* Text preview */}
        <p className="text-[10px] leading-relaxed text-gray-300 mb-3 min-h-[36px]">
          {truncate(confession.text, 50)}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <MintBadge minted={confession.minted} />
          {confession.linkedIds.length > 0 && (
            <span className="font-pixel text-[7px] text-wizard-cyan/50">
              ✦ {confession.linkedIds.length} linked
            </span>
          )}
        </div>

        {/* Corner decorations */}
        <div className="absolute top-0 left-0 h-2 w-2 border-t border-l border-wizard-cyan/30 group-hover:border-wizard-cyan transition-colors" />
        <div className="absolute top-0 right-0 h-2 w-2 border-t border-r border-wizard-cyan/30 group-hover:border-wizard-cyan transition-colors" />
        <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-wizard-cyan/30 group-hover:border-wizard-cyan transition-colors" />
        <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-wizard-cyan/30 group-hover:border-wizard-cyan transition-colors" />
      </motion.div>
    </Link>
  );
}
