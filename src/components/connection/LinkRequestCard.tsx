'use client';

import PotionButton from '@/components/ui/PotionButton';
import WizardCharacter from '@/components/confession/WizardCharacter';
import { truncate } from '@/lib/utils';
import type { Confession } from '@/data/mock';

interface Props {
  confession: Confession;
  status: 'none' | 'pending' | 'confirmed';
  onRequestLink?: () => void;
}

export default function LinkRequestCard({ confession, status, onRequestLink }: Props) {
  return (
    <div className="flex items-center gap-3 border border-wizard-violet/20 bg-wizard-purple/30 p-3">
      <WizardCharacter text={confession.text} size={48} glow={false} />
      <div className="flex-1 min-w-0">
        <p className="font-pixel text-[8px] text-gray-300 truncate">
          {truncate(confession.text, 40)}
        </p>
        <div className="mt-1">
          {status === 'confirmed' && (
            <span className="font-pixel text-[7px] text-wizard-green animate-pulse-glow">
              ✦ Linked
            </span>
          )}
          {status === 'pending' && (
            <span className="font-pixel text-[7px] text-wizard-gold animate-pulse-glow">
              ⧗ Pending
            </span>
          )}
          {status === 'none' && onRequestLink && (
            <PotionButton variant="cyan" small onClick={onRequestLink}>
              ✦ Request Link
            </PotionButton>
          )}
        </div>
      </div>
    </div>
  );
}
