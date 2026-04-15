'use client';

import { cn } from '@/lib/utils';

interface Props {
  size?: number;
  className?: string;
}

export default function PixelPlanet({ size = 200, className }: Props) {
  const s = size;
  const half = s / 2;

  return (
    <div
      className={cn('relative inline-block pixel-render', className)}
      style={{ width: s, height: s }}
    >
      <svg
        viewBox="0 0 128 128"
        width={s}
        height={s}
        shapeRendering="crispEdges"
      >
        <defs>
          {/* Planet glow */}
          <radialGradient id="planet-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00f5d4" stopOpacity="0.15" />
            <stop offset="60%" stopColor="#b24bf3" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0a0a1a" stopOpacity="0" />
          </radialGradient>
          {/* Planet body gradient */}
          <radialGradient id="planet-body" cx="40%" cy="35%" r="55%">
            <stop offset="0%" stopColor="#a8e6cf" />
            <stop offset="25%" stopColor="#55c4a6" />
            <stop offset="50%" stopColor="#3d9ecf" />
            <stop offset="75%" stopColor="#2d6ea3" />
            <stop offset="100%" stopColor="#1a3a5c" />
          </radialGradient>
          {/* Atmosphere overlay */}
          <radialGradient id="atmo" cx="50%" cy="50%" r="50%">
            <stop offset="70%" stopColor="#fff" stopOpacity="0" />
            <stop offset="85%" stopColor="#ff6b9d" stopOpacity="0.15" />
            <stop offset="95%" stopColor="#b24bf3" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#1a0a2e" stopOpacity="0.6" />
          </radialGradient>
          {/* Ring gradient */}
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffd700" stopOpacity="0.8" />
            <stop offset="30%" stopColor="#ff6b9d" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#00f5d4" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#39ff14" stopOpacity="0.3" />
          </linearGradient>
          <filter id="planet-bloom">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ambient glow */}
        <circle cx="64" cy="64" r="60" fill="url(#planet-glow)" />

        {/* Ring behind planet */}
        <ellipse
          cx="64" cy="68" rx="52" ry="12"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="3"
          opacity="0.5"
          strokeDasharray="4 2"
        />

        {/* Planet body */}
        <circle cx="64" cy="60" r="34" fill="url(#planet-body)" filter="url(#planet-bloom)" />

        {/* Landmasses (pixel blocks) */}
        <g opacity="0.7">
          {/* Continent 1 - larger */}
          <rect x="48" y="44" width="8" height="6" rx="0" fill="#2ecc71" />
          <rect x="54" y="42" width="6" height="8" rx="0" fill="#27ae60" />
          <rect x="52" y="48" width="10" height="4" rx="0" fill="#2ecc71" />
          <rect x="56" y="50" width="6" height="4" rx="0" fill="#1abc9c" />
          {/* Continent 2 */}
          <rect x="72" y="52" width="8" height="6" rx="0" fill="#27ae60" />
          <rect x="70" y="56" width="6" height="4" rx="0" fill="#2ecc71" />
          <rect x="76" y="54" width="4" height="6" rx="0" fill="#1abc9c" />
          {/* Continent 3 - small island */}
          <rect x="58" y="64" width="6" height="4" rx="0" fill="#2ecc71" />
          <rect x="56" y="66" width="4" height="4" rx="0" fill="#27ae60" />
          {/* Polar cap */}
          <rect x="56" y="30" width="12" height="4" rx="0" fill="#ecf0f1" opacity="0.6" />
          <rect x="58" y="28" width="8" height="4" rx="0" fill="#fff" opacity="0.4" />
        </g>

        {/* Cloud highlights */}
        <g opacity="0.3">
          <rect x="50" y="38" width="14" height="2" fill="#fff" />
          <rect x="62" y="46" width="12" height="2" fill="#fff" />
          <rect x="46" y="58" width="10" height="2" fill="#fff" />
          <rect x="66" y="62" width="8" height="2" fill="#fff" />
        </g>

        {/* Specular highlight */}
        <circle cx="52" cy="46" r="8" fill="#fff" opacity="0.12" />
        <circle cx="50" cy="44" r="4" fill="#fff" opacity="0.15" />

        {/* Atmosphere overlay */}
        <circle cx="64" cy="60" r="34" fill="url(#atmo)" />

        {/* Ring in front of planet */}
        <path
          d="M 12 68 Q 38 80 64 80 Q 90 80 116 68"
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth="3"
          opacity="0.7"
          strokeLinecap="round"
        />
        {/* Ring particle */}
        <circle cx="90" cy="74" r="1.5" fill="#ff6b9d" opacity="0.9">
          <animate attributeName="cx" values="20;108;20" dur="6s" repeatCount="indefinite" />
          <animate attributeName="cy" values="76;68;76" dur="6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur="6s" repeatCount="indefinite" />
        </circle>

        {/* Moon */}
        <g filter="url(#planet-bloom)">
          <circle cx="80" cy="102" r="6" fill="#8e9aaf" />
          <circle cx="78" cy="100" r="2" fill="#a8b2c1" opacity="0.6" />
          <circle cx="82" cy="104" r="1.5" fill="#6b7b8d" opacity="0.5" />
          <circle cx="80" cy="102" r="6" fill="#fff" opacity="0.06" />
        </g>
        {/* Moon glow */}
        <circle cx="80" cy="102" r="10" fill="#8e9aaf" opacity="0.08" />

        {/* Pixel stars */}
        <g fill="#fff">
          <rect x="10" y="10" width="2" height="2" opacity="0.8">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="2.1s" repeatCount="indefinite" />
          </rect>
          <rect x="105" y="15" width="2" height="2" opacity="0.6">
            <animate attributeName="opacity" values="0.2;0.9;0.2" dur="1.8s" repeatCount="indefinite" />
          </rect>
          <rect x="20" y="100" width="2" height="2" opacity="0.7">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2.5s" repeatCount="indefinite" />
          </rect>
          <rect x="115" y="95" width="2" height="2" opacity="0.5">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="3s" repeatCount="indefinite" />
          </rect>
          <rect x="8" y="55" width="2" height="2" opacity="0.9">
            <animate attributeName="opacity" values="0.5;1;0.5" dur="1.6s" repeatCount="indefinite" />
          </rect>
          <rect x="118" y="45" width="2" height="2" opacity="0.6">
            <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.3s" repeatCount="indefinite" />
          </rect>
          <rect x="25" y="25" width="2" height="2" opacity="0.4">
            <animate attributeName="opacity" values="0.2;0.7;0.2" dur="2.8s" repeatCount="indefinite" />
          </rect>
          <rect x="98" y="110" width="2" height="2" opacity="0.7">
            <animate attributeName="opacity" values="0.3;1;0.3" dur="1.9s" repeatCount="indefinite" />
          </rect>
        </g>
        {/* Colored pixel stars */}
        <g>
          <rect x="15" y="75" width="2" height="2" fill="#b24bf3" opacity="0.6">
            <animate attributeName="opacity" values="0.2;0.8;0.2" dur="2.4s" repeatCount="indefinite" />
          </rect>
          <rect x="100" y="30" width="2" height="2" fill="#ff6b9d" opacity="0.5">
            <animate attributeName="opacity" values="0.3;0.7;0.3" dur="3.1s" repeatCount="indefinite" />
          </rect>
          <rect x="35" y="8" width="2" height="2" fill="#00f5d4" opacity="0.7">
            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="110" y="70" width="2" height="2" fill="#b24bf3" opacity="0.4">
            <animate attributeName="opacity" values="0.1;0.6;0.1" dur="2.7s" repeatCount="indefinite" />
          </rect>
        </g>
      </svg>
    </div>
  );
}
