import { cn } from '@/lib/utils';

interface Props {
  minted: boolean;
  className?: string;
}

export default function MintBadge({ minted, className }: Props) {
  if (minted) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 font-pixel text-[8px] text-wizard-gold',
          'animate-pulse-glow',
          className,
        )}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="pixel-render">
          <rect x="4" y="0" width="2" height="2" />
          <rect x="2" y="2" width="6" height="2" />
          <rect x="0" y="4" width="10" height="2" />
          <rect x="2" y="6" width="6" height="2" />
          <rect x="4" y="8" width="2" height="2" />
        </svg>
        Minted
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-pixel text-[8px] text-gray-500',
        className,
      )}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="pixel-render opacity-40">
        <rect x="4" y="0" width="2" height="2" />
        <rect x="2" y="2" width="2" height="2" />
        <rect x="6" y="2" width="2" height="2" />
        <rect x="0" y="4" width="2" height="2" />
        <rect x="8" y="4" width="2" height="2" />
        <rect x="2" y="6" width="2" height="2" />
        <rect x="6" y="6" width="2" height="2" />
        <rect x="4" y="8" width="2" height="2" />
      </svg>
      Not Minted
    </span>
  );
}
