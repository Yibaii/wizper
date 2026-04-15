'use client';

import { cn } from '@/lib/utils';

interface Props {
  className?: string;
  compact?: boolean;
  verified?: boolean;  // true = ZK proof verified on-chain
  committed?: boolean; // true = commitment submitted to chain
}

export default function ZKShield({ className, compact, verified, committed }: Props) {
  const status = verified ? 'verified' : committed ? 'committed' : 'protected';
  const statusText = {
    verified: 'ZK Verified',
    committed: 'ZK Committed',
    protected: 'ZK Protected',
  }[status];
  const subText = {
    verified: 'Ownership verified via zero-knowledge proof',
    committed: 'Identity commitment recorded on-chain',
    protected: 'Identity protected via Zero-Knowledge Proofs',
  }[status];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2',
        verified ? '' : 'animate-pulse-glow',
        compact ? 'text-[7px]' : 'text-[9px]',
        'text-wizard-green font-pixel',
        className,
      )}
    >
      {/* Pixel shield icon */}
      <svg
        width={compact ? 14 : 18}
        height={compact ? 16 : 20}
        viewBox="0 0 18 20"
        fill="none"
        className="pixel-render shrink-0"
      >
        <rect x="6" y="0" width="6" height="2" fill="currentColor" />
        <rect x="4" y="2" width="10" height="2" fill="currentColor" />
        <rect x="2" y="4" width="14" height="2" fill="currentColor" />
        <rect x="2" y="6" width="14" height="2" fill="currentColor" />
        <rect x="2" y="8" width="14" height="2" fill="currentColor" />
        <rect x="4" y="10" width="10" height="2" fill="currentColor" />
        <rect x="4" y="12" width="10" height="2" fill="currentColor" />
        <rect x="6" y="14" width="6" height="2" fill="currentColor" />
        <rect x="6" y="16" width="6" height="2" fill="currentColor" />
        <rect x="8" y="18" width="2" height="2" fill="currentColor" />
        {/* Check mark */}
        <rect x="6" y="8" width="2" height="2" fill="#0a0a1a" />
        <rect x="8" y="10" width="2" height="2" fill="#0a0a1a" />
        <rect x="10" y="6" width="2" height="2" fill="#0a0a1a" />
        <rect x="12" y="4" width="2" height="2" fill="#0a0a1a" />
      </svg>
      <div className="flex flex-col leading-tight">
        <span>{statusText}</span>
        {!compact && (
          <span className="text-[7px] opacity-60">{subText}</span>
        )}
      </div>
    </div>
  );
}
