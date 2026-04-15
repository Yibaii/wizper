'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

/* ---- Deterministic hash ---- */
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/* ---- Palette options ---- */
const ROBE_COLORS = [
  { robe: '#6b2fa0', hat: '#4a1a70', accent: '#b24bf3' },   // purple
  { robe: '#1a6b5a', hat: '#0e4a3e', accent: '#00f5d4' },   // teal
  { robe: '#8b2252', hat: '#5a1538', accent: '#ff6b9d' },   // crimson
  { robe: '#2a5a8b', hat: '#1a3a5e', accent: '#00bfff' },   // blue
  { robe: '#6b6b20', hat: '#4a4a10', accent: '#ffd700' },   // gold
  { robe: '#2a7a2a', hat: '#1a5a1a', accent: '#39ff14' },   // green
  { robe: '#8b4513', hat: '#5a2e0d', accent: '#d4a574' },   // brown
  { robe: '#4a4a6a', hat: '#2a2a4a', accent: '#a0a0c0' },   // grey/silver
];

const SKIN_COLORS = ['#f5d0a9', '#e8c090', '#d2a06a', '#c08050', '#8b6040'];
const BEARD_COLORS = ['#ffffff', '#d0d0d0', '#a08060', '#604020', '#303030', '#ffd700', '#ff6040'];
const STAFF_TOPS = ['orb', 'crystal', 'flame', 'star', 'crescent'] as const;
const HAT_STYLES = ['pointed', 'wide', 'hooded', 'crown'] as const;

interface Props {
  text: string;
  size?: number;
  className?: string;
  glow?: boolean;
}

export default function WizardCharacter({ text, size = 120, className, glow = true }: Props) {
  const wizard = useMemo(() => {
    const h = hashStr(text);
    const pick = (arr: readonly unknown[], offset: number) => arr[(h + offset) % arr.length];

    return {
      palette: pick(ROBE_COLORS, 0) as typeof ROBE_COLORS[0],
      skin: pick(SKIN_COLORS, 7) as string,
      beard: pick(BEARD_COLORS, 13) as string,
      staffTop: pick(STAFF_TOPS, 19) as typeof STAFF_TOPS[number],
      hatStyle: pick(HAT_STYLES, 23) as typeof HAT_STYLES[number],
      hasBeard: h % 3 !== 0,
      hasStaff: h % 4 !== 0,
      hasCat: h % 7 === 0,
      eyeType: h % 4,
    };
  }, [text]);

  const { palette, skin, beard, staffTop, hatStyle, hasBeard, hasStaff, hasCat, eyeType } = wizard;

  return (
    <div
      className={cn('relative inline-block', className)}
      style={{
        width: size,
        height: size,
        filter: glow ? `drop-shadow(0 0 ${size / 6}px ${palette.accent})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 64 80"
        width={size}
        height={size}
        shapeRendering="crispEdges"
        className="pixel-render"
      >
        {/* Ambient glow */}
        <circle cx="32" cy="50" r="30" fill={palette.accent} opacity="0.06" />

        {/* Staff (behind body) */}
        {hasStaff && <Staff top={staffTop} accent={palette.accent} />}

        {/* Hat */}
        <Hat style={hatStyle} color={palette.hat} accent={palette.accent} />

        {/* Face */}
        <rect x="22" y="26" width="20" height="14" fill={skin} />
        {/* Eyes */}
        <WizardEyes type={eyeType} />

        {/* Beard */}
        {hasBeard && <Beard color={beard} />}

        {/* Body / Robe */}
        <rect x="18" y="40" width="28" height="24" fill={palette.robe} />
        {/* Robe detail: belt */}
        <rect x="18" y="50" width="28" height="3" fill={palette.accent} opacity="0.5" />
        {/* Robe bottom trim */}
        <rect x="16" y="62" width="32" height="2" fill={palette.hat} />

        {/* Arms */}
        <rect x="14" y="42" width="4" height="14" fill={palette.robe} />
        <rect x="46" y="42" width="4" height="14" fill={palette.robe} />
        {/* Hands */}
        <rect x="14" y="54" width="4" height="4" fill={skin} />
        <rect x="46" y="54" width="4" height="4" fill={skin} />

        {/* Feet */}
        <rect x="22" y="64" width="8" height="4" fill={palette.hat} />
        <rect x="34" y="64" width="8" height="4" fill={palette.hat} />

        {/* Cat companion */}
        {hasCat && <PixelCat x={50} y={58} color={palette.accent} />}

        {/* Accent sparkles */}
        <rect x="10" y="20" width="2" height="2" fill={palette.accent} opacity="0.6" />
        <rect x="52" y="16" width="2" height="2" fill={palette.accent} opacity="0.4" />
        <rect x="8" y="46" width="2" height="2" fill={palette.accent} opacity="0.3" />
      </svg>
    </div>
  );
}

/* ---- Hat Styles ---- */
function Hat({ style, color, accent }: { style: string; color: string; accent: string }) {
  switch (style) {
    case 'pointed':
      return (
        <>
          <polygon points="22,26 32,2 42,26" fill={color} />
          <rect x="22" y="24" width="20" height="4" fill={color} />
          {/* Hat band */}
          <rect x="22" y="22" width="20" height="3" fill={accent} opacity="0.5" />
          {/* Star decoration */}
          <rect x="30" y="8" width="4" height="4" fill={accent} opacity="0.7" />
        </>
      );
    case 'wide':
      return (
        <>
          <polygon points="26,26 32,8 38,26" fill={color} />
          <ellipse cx="32" cy="26" rx="18" ry="4" fill={color} />
          <rect x="28" y="12" width="3" height="3" fill={accent} opacity="0.5" />
        </>
      );
    case 'hooded':
      return (
        <>
          <path d="M18 40 L18 18 Q18 6 32 6 Q46 6 46 18 L46 40" fill={color} />
          {/* Hood opening */}
          <path d="M22 26 Q22 16 32 14 Q42 16 42 26" fill="none" stroke={accent} strokeWidth="1" opacity="0.4" />
        </>
      );
    case 'crown':
      return (
        <>
          <rect x="20" y="18" width="24" height="10" fill={color} />
          {/* Crown points */}
          <rect x="20" y="14" width="4" height="6" fill={color} />
          <rect x="28" y="12" width="4" height="8" fill={color} />
          <rect x="36" y="14" width="4" height="6" fill={color} />
          <rect x="44" y="14" width="4" height="6" fill={color} />
          {/* Gems */}
          <rect x="21" y="15" width="2" height="2" fill={accent} />
          <rect x="29" y="13" width="2" height="2" fill="#ff6b9d" />
          <rect x="37" y="15" width="2" height="2" fill={accent} />
        </>
      );
    default:
      return <polygon points="22,26 32,4 42,26" fill={color} />;
  }
}

/* ---- Eyes ---- */
function WizardEyes({ type }: { type: number }) {
  const dark = '#0a0a1a';
  const y = 30;
  switch (type) {
    case 0: // Dot eyes
      return (
        <>
          <rect x="25" y={y} width="3" height="3" fill={dark} />
          <rect x="36" y={y} width="3" height="3" fill={dark} />
        </>
      );
    case 1: // Glowing eyes
      return (
        <>
          <rect x="25" y={y} width="3" height="3" fill="#ffd700" />
          <rect x="36" y={y} width="3" height="3" fill="#ffd700" />
          <rect x="25" y={y} width="3" height="3" fill="#fff" opacity="0.5" />
          <rect x="36" y={y} width="3" height="3" fill="#fff" opacity="0.5" />
        </>
      );
    case 2: // Highlight eyes
      return (
        <>
          <rect x="24" y={y} width="4" height="4" fill={dark} />
          <rect x="36" y={y} width="4" height="4" fill={dark} />
          <rect x="25" y={y} width="1" height="1" fill="#fff" />
          <rect x="37" y={y} width="1" height="1" fill="#fff" />
        </>
      );
    case 3: // Narrow / squint
      return (
        <>
          <rect x="24" y={y + 1} width="5" height="2" fill={dark} />
          <rect x="35" y={y + 1} width="5" height="2" fill={dark} />
        </>
      );
    default:
      return null;
  }
}

/* ---- Beard ---- */
function Beard({ color }: { color: string }) {
  return (
    <>
      {/* Main beard */}
      <path d="M24 38 L24 50 Q32 56 40 50 L40 38 Z" fill={color} opacity="0.9" />
      {/* Mustache */}
      <rect x="26" y="37" width="12" height="3" fill={color} />
    </>
  );
}

/* ---- Staff ---- */
function Staff({ top, accent }: { top: string; accent: string }) {
  const staffColor = '#8b6040';
  return (
    <>
      {/* Staff pole */}
      <rect x="10" y="14" width="3" height="56" fill={staffColor} />
      {/* Staff top decoration */}
      {top === 'orb' && (
        <>
          <circle cx="11" cy="12" r="5" fill={accent} opacity="0.8" />
          <circle cx="11" cy="12" r="3" fill="#fff" opacity="0.3" />
        </>
      )}
      {top === 'crystal' && (
        <polygon points="11,4 16,12 11,16 6,12" fill={accent} opacity="0.8" />
      )}
      {top === 'flame' && (
        <>
          <polygon points="11,4 15,14 7,14" fill="#ff6b35" opacity="0.9" />
          <polygon points="11,6 13,12 9,12" fill="#ffd700" opacity="0.7" />
        </>
      )}
      {top === 'star' && (
        <polygon points="11,4 13,9 18,9 14,13 16,18 11,15 6,18 8,13 4,9 9,9" fill={accent} opacity="0.8" />
      )}
      {top === 'crescent' && (
        <>
          <circle cx="11" cy="10" r="5" fill={accent} opacity="0.8" />
          <circle cx="13" cy="9" r="4" fill="#0a0a1a" />
        </>
      )}
    </>
  );
}

/* ---- Pixel Cat companion ---- */
function PixelCat({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      {/* Body */}
      <rect x={x} y={y} width="8" height="6" fill={color} opacity="0.8" />
      {/* Head */}
      <rect x={x + 1} y={y - 4} width="6" height="5" fill={color} opacity="0.8" />
      {/* Ears */}
      <rect x={x + 1} y={y - 6} width="2" height="2" fill={color} opacity="0.8" />
      <rect x={x + 5} y={y - 6} width="2" height="2" fill={color} opacity="0.8" />
      {/* Eyes */}
      <rect x={x + 2} y={y - 3} width="1" height="1" fill="#0a0a1a" />
      <rect x={x + 5} y={y - 3} width="1" height="1" fill="#0a0a1a" />
      {/* Tail */}
      <rect x={x + 7} y={y - 2} width="2" height="2" fill={color} opacity="0.8" />
      <rect x={x + 8} y={y - 4} width="2" height="3" fill={color} opacity="0.8" />
    </g>
  );
}
