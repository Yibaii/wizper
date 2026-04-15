'use client';

import { cn } from '@/lib/utils';
import { type ButtonHTMLAttributes } from 'react';

type Variant = 'cyan' | 'violet' | 'gold' | 'green' | 'ember';

const variantStyles: Record<Variant, string> = {
  cyan: 'border-wizard-cyan text-wizard-cyan hover:bg-wizard-cyan hover:text-wizard-dark shadow-[0_0_0_0_#00f5d4] hover:shadow-[0_0_16px_#00f5d4,0_0_32px_#00f5d480]',
  violet: 'border-wizard-violet text-wizard-violet hover:bg-wizard-violet hover:text-white shadow-[0_0_0_0_#b24bf3] hover:shadow-[0_0_16px_#b24bf3,0_0_32px_#b24bf380]',
  gold: 'border-wizard-gold text-wizard-gold hover:bg-wizard-gold hover:text-wizard-dark shadow-[0_0_0_0_#ffd700] hover:shadow-[0_0_16px_#ffd700,0_0_32px_#ffd70080]',
  green: 'border-wizard-green text-wizard-green hover:bg-wizard-green hover:text-wizard-dark shadow-[0_0_0_0_#39ff14] hover:shadow-[0_0_16px_#39ff14,0_0_32px_#39ff1480]',
  ember: 'border-wizard-ember text-wizard-ember hover:bg-wizard-ember hover:text-white shadow-[0_0_0_0_#ff6b35] hover:shadow-[0_0_16px_#ff6b35,0_0_32px_#ff6b3580]',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  small?: boolean;
}

export default function PotionButton({
  variant = 'cyan',
  small = false,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      className={cn(
        'font-pixel border-2 bg-transparent',
        'transition-all duration-200 ease-out',
        'active:scale-95 disabled:opacity-40 disabled:pointer-events-none',
        'cursor-pointer',
        small ? 'px-3 py-1.5 text-[8px]' : 'px-6 py-3 text-[10px]',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
