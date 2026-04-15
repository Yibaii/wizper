import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function ScrollPanel({ children, className }: Props) {
  return (
    <div
      className={cn(
        'relative bg-wizard-parchment/90 border-2 border-wizard-parchment-dark',
        'p-6 text-wizard-dark',
        'shadow-[inset_0_0_30px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      {/* Top ornament */}
      <div className="absolute -top-[3px] left-6 right-6 h-[3px] bg-wizard-parchment-dark/60" />
      {/* Bottom ornament */}
      <div className="absolute -bottom-[3px] left-6 right-6 h-[3px] bg-wizard-parchment-dark/60" />
      {/* Subtle texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='8' height='8' viewBox='0 0 8 8' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M0 0h4v4H0zM4 4h4v4H4z'/%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
