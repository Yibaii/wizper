'use client';

import { useMemo } from 'react';
import { textToCreature, type Palette } from '@/lib/emotions';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  size?: number;
  className?: string;
  glow?: boolean;
}

export default function EmotionCharacter({ text, size = 120, className, glow = true }: Props) {
  const creature = useMemo(() => textToCreature(text), [text]);
  const { palette, bodyType, eyeStyle, mouthStyle } = creature;
  const filterId = `glow-${text.length}-${bodyType}`;

  return (
    <div
      className={cn('relative inline-block', className)}
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 ${size / 8}px ${palette.glow})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="pixel-render"
      >
        <defs>
          <filter id={filterId}>
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="32" cy="34" r="28" fill={palette.glow} opacity="0.08" />

        {/* Body */}
        <g filter={`url(#${filterId})`}>
          <Body type={bodyType} palette={palette} />
          <Eyes style={eyeStyle} bodyType={bodyType} />
          <Mouth style={mouthStyle} bodyType={bodyType} />
        </g>
      </svg>
    </div>
  );
}

/* ---- Sub-components for SVG parts ---- */

function Body({ type, palette }: { type: number; palette: Palette }) {
  const p = palette.primary;
  const s = palette.secondary;
  switch (type) {
    case 0: // Orb
      return (
        <>
          <circle cx="32" cy="34" r="18" fill={p} />
          <circle cx="32" cy="34" r="14" fill={s} opacity="0.3" />
        </>
      );
    case 1: // Blob
      return <rect x="14" y="18" width="36" height="30" rx="8" fill={p} />;
    case 2: // Ghost
      return (
        <path
          d="M16 38 L16 22 Q16 12 32 12 Q48 12 48 22 L48 38 L44 34 L40 38 L36 34 L32 38 L28 34 L24 38 L20 34 Z"
          fill={p}
        />
      );
    case 3: // Cat
      return (
        <>
          <rect x="16" y="24" width="32" height="24" rx="3" fill={p} />
          <polygon points="16,24 16,12 26,24" fill={p} />
          <polygon points="48,24 48,12 38,24" fill={p} />
          <rect x="16" y="24" width="32" height="6" fill={s} opacity="0.2" />
        </>
      );
    case 4: // Crystal
      return (
        <>
          <polygon points="32,8 52,32 32,54 12,32" fill={p} />
          <polygon points="32,8 32,54 12,32" fill={s} opacity="0.25" />
        </>
      );
    case 5: // Mushroom
      return (
        <>
          <ellipse cx="32" cy="26" rx="22" ry="14" fill={p} />
          <rect x="26" y="26" width="12" height="22" rx="2" fill={s} />
          {/* Spots */}
          <circle cx="24" cy="22" r="3" fill={s} opacity="0.5" />
          <circle cx="38" cy="20" r="2" fill={s} opacity="0.5" />
        </>
      );
    case 6: // Slime
      return (
        <path
          d="M12 42 Q12 20 32 14 Q52 20 52 42 Q44 48 32 48 Q20 48 12 42 Z"
          fill={p}
        />
      );
    case 7: // Star creature
      return (
        <>
          <polygon
            points="32,6 38,22 56,22 42,32 48,50 32,40 16,50 22,32 8,22 26,22"
            fill={p}
          />
          <polygon
            points="32,6 38,22 56,22 42,32 48,50 32,40 16,50 22,32 8,22 26,22"
            fill={s}
            opacity="0.2"
          />
        </>
      );
    default:
      return <circle cx="32" cy="34" r="18" fill={p} />;
  }
}

function getEyeY(bodyType: number) {
  if (bodyType === 2) return 24; // ghost
  if (bodyType === 4) return 28; // crystal
  if (bodyType === 5) return 22; // mushroom
  if (bodyType === 7) return 26; // star
  return 30;
}

function Eyes({ style, bodyType }: { style: number; bodyType: number }) {
  const dark = '#0a0a1a';
  const y = getEyeY(bodyType);
  switch (style) {
    case 0: // Pixel dot eyes
      return (
        <>
          <rect x="24" y={y} width="4" height="4" fill={dark} />
          <rect x="36" y={y} width="4" height="4" fill={dark} />
        </>
      );
    case 1: // Line eyes
      return (
        <>
          <rect x="22" y={y + 1} width="8" height="2" fill={dark} />
          <rect x="34" y={y + 1} width="8" height="2" fill={dark} />
        </>
      );
    case 2: // Big round eyes with highlight
      return (
        <>
          <circle cx="26" cy={y + 2} r="4" fill={dark} />
          <circle cx="38" cy={y + 2} r="4" fill={dark} />
          <rect x="24" y={y} width="2" height="2" fill="#fff" />
          <rect x="36" y={y} width="2" height="2" fill="#fff" />
        </>
      );
    case 3: // X eyes
      return (
        <>
          <line x1="22" y1={y - 2} x2="28" y2={y + 4} stroke={dark} strokeWidth="2" />
          <line x1="28" y1={y - 2} x2="22" y2={y + 4} stroke={dark} strokeWidth="2" />
          <line x1="36" y1={y - 2} x2="42" y2={y + 4} stroke={dark} strokeWidth="2" />
          <line x1="42" y1={y - 2} x2="36" y2={y + 4} stroke={dark} strokeWidth="2" />
        </>
      );
    default:
      return null;
  }
}

function Mouth({ style, bodyType }: { style: number; bodyType: number }) {
  const dark = '#0a0a1a';
  const baseY = getEyeY(bodyType) + 8;
  switch (style) {
    case 0: // Smile
      return (
        <path d={`M26 ${baseY} Q32 ${baseY + 6} 38 ${baseY}`} fill="none" stroke={dark} strokeWidth="2" />
      );
    case 1: // Frown
      return (
        <path d={`M26 ${baseY + 4} Q32 ${baseY - 2} 38 ${baseY + 4}`} fill="none" stroke={dark} strokeWidth="2" />
      );
    case 2: // O mouth
      return <circle cx="32" cy={baseY + 2} r="3" fill={dark} />;
    case 3: // Flat
      return <rect x="28" y={baseY + 1} width="8" height="2" fill={dark} />;
    default:
      return null;
  }
}
