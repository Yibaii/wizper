'use client';

import { useRef, useEffect } from 'react';
import { useTheme } from '@/context/ThemeContext';

/* ---- Palettes ---- */
const NIGHT = {
  sky: ['#0c1445', '#162058', '#1e2e6e'],
  star: '#ffffff',
  starDim: 'rgba(180,200,255,0.3)',
  moonGlow: 'rgba(255,240,200,0.08)',
  /* far mountains */
  mtnFar: '#0e1838',
  mtnMid: '#111c40',
  /* castle silhouette (same as mtnMid) */
  castle: '#111c40',
  castleLight: '#1a2850',
  /* foreground hills / ground */
  hillFar: '#0e1636',
  hillNear: '#0c1230',
  ground: '#080e24',
  /* houses */
  wallDark: '#141c3c',
  wallLight: '#1c2650',
  roofDark: '#0a0e28',
  roofLight: '#10163a',
  windowGlow: '#ff8c20',
  windowBright: '#ffb840',
  windowAura: 'rgba(255,140,32,0.30)',
  /* trees */
  treeDark: '#0a1228',
  treeMid: '#0e1632',
  treeLight: '#121a3a',
  /* cloud (faint at night) */
  cloud: '#1e2e5e',
  cloudLight: '#243668',
};

const DAY = {
  sky: ['#5eaadd', '#82c4ee', '#aadcf8'],
  star: 'transparent',
  starDim: 'transparent',
  moonGlow: 'transparent',
  mtnFar: '#8baacc',
  mtnMid: '#7498b8',
  castle: '#7498b8',
  castleLight: '#84a8c8',
  hillFar: '#5a9a48',
  hillNear: '#4a8a3a',
  ground: '#3e7830',
  wallDark: '#8a7060',
  wallLight: '#c8a888',
  roofDark: '#6a4030',
  roofLight: '#8a5a42',
  windowGlow: '#2a3460',
  windowBright: '#3a4878',
  windowAura: 'rgba(42,52,96,0.10)',
  treeDark: '#2e6a22',
  treeMid: '#3a7a2e',
  treeLight: '#4a8a38',
  cloud: '#ffffff',
  cloudLight: '#e8f0fa',
};

/* ---- Seeded random ---- */
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ---- Terrain height profile (0=left, 1=right) → height offset (0=bottom, higher=taller) ----
   Left side is high (big hill), dips in center-left, rises slightly center, right is lower with bumps */
function terrainAt(x: number): number {
  // Main shape: high left hill, valley, gentle right
  const leftHill = Math.max(0, 1 - (x / 0.22)) * 0.32;                   // tall left peak
  const leftSlope = Math.max(0, 1 - Math.abs((x - 0.15) / 0.12)) * 0.18; // left shoulder
  const valley = -Math.max(0, 1 - Math.abs((x - 0.38) / 0.10)) * 0.04;   // slight valley
  const midBump = Math.max(0, 1 - Math.abs((x - 0.55) / 0.08)) * 0.10;   // mid rise
  const rightBump = Math.max(0, 1 - Math.abs((x - 0.78) / 0.12)) * 0.18; // right hill
  const rightDip = Math.max(0, 1 - Math.abs((x - 0.92) / 0.08)) * 0.12;  // far right rise
  return leftHill + leftSlope + valley + midBump + rightBump + rightDip;
}

/* ---- Pre-generate scene data (deterministic) ---- */
const rng = seededRand(77);

/* stars */
const STARS: { x: number; y: number; r: number; phase: number; sp: number }[] = [];
for (let i = 0; i < 160; i++) {
  STARS.push({ x: rng(), y: rng() * 0.5, r: rng() * 1.6 + 0.5, phase: rng() * Math.PI * 2, sp: rng() * 0.012 + 0.003 });
}

/* clouds */
const CLOUDS: { x: number; y: number; sx: number }[] = [];
for (let i = 0; i < 7; i++) {
  CLOUDS.push({ x: rng(), y: 0.06 + rng() * 0.18, sx: 0.6 + rng() * 0.8 });
}

/* houses scattered along terrain — bigger ones on hills, smaller in valleys */
interface House { x: number; hScale: number; wScale: number; chimney: boolean; wins: number; roofStyle: number; isTower: boolean }
const HOUSES: House[] = [];
{
  // Place a big tower on the left hill peak
  HOUSES.push({ x: 0.06, hScale: 1.8, wScale: 0.9, chimney: true, wins: 2, roofStyle: 1, isTower: true });
  HOUSES.push({ x: 0.12, hScale: 1.2, wScale: 0.7, chimney: false, wins: 1, roofStyle: 1, isTower: false });
  // Scatter the rest
  const positions = [0.20, 0.28, 0.34, 0.42, 0.50, 0.58, 0.64, 0.72, 0.80, 0.88, 0.94];
  for (const bx of positions) {
    const jitter = (rng() - 0.5) * 0.03;
    HOUSES.push({
      x: bx + jitter,
      hScale: 0.4 + rng() * 0.9,
      wScale: 0.5 + rng() * 0.7,
      chimney: rng() > 0.5,
      wins: Math.floor(1 + rng() * 3),
      roofStyle: rng() > 0.4 ? 1 : 0,
      isTower: rng() > 0.75,
    });
  }
}

/* trees — more on hills, scattered randomly */
interface Tree { x: number; s: number; style: number }
const TREES: Tree[] = [];
{
  const positions = [0.02, 0.08, 0.15, 0.19, 0.25, 0.31, 0.39, 0.46, 0.53, 0.61, 0.67, 0.74, 0.79, 0.84, 0.90, 0.96];
  for (const tx of positions) {
    const jitter = (rng() - 0.5) * 0.02;
    TREES.push({ x: tx + jitter, s: 0.5 + rng() * 0.7, style: rng() > 0.35 ? 0 : 1 });
  }
}

export default function PixelLandscape() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { time } = useTheme();

  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;

    function resize() {
      cvs!.width = window.innerWidth;
      cvs!.height = window.innerHeight;
      w = cvs!.width;
      h = cvs!.height;
    }
    resize();
    window.addEventListener('resize', resize);

    type P = typeof NIGHT;

    const px = (x: number, y: number, rw: number, rh: number) =>
      ctx!.fillRect(Math.round(x), Math.round(y), Math.round(rw), Math.round(rh));

    /* ---- Sky ---- */
    function drawSky(p: P) {
      const g = ctx!.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, p.sky[0]);
      g.addColorStop(0.5, p.sky[1]);
      g.addColorStop(1, p.sky[2]);
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, w, h);
    }

    /* ---- Stars (night only) ---- */
    function drawStars(p: P, t: number) {
      if (p.star === 'transparent') return;
      for (const s of STARS) {
        const sx = s.x * w, sy = s.y * h;
        const a = 0.3 + 0.7 * Math.abs(Math.sin(t * s.sp + s.phase));
        const sz = Math.max(1, Math.round(s.r));
        ctx!.globalAlpha = a * 0.3;
        ctx!.fillStyle = p.starDim;
        px(sx - 1, sy - 1, sz + 2, sz + 2);
        ctx!.globalAlpha = a;
        ctx!.fillStyle = p.star;
        px(sx, sy, sz, sz);
      }
      ctx!.globalAlpha = 1;
    }

    /* ---- Clouds (day prominent, night faint) ---- */
    function drawClouds(p: P) {
      if (p.cloud === 'transparent') return;
      const isNight = time === 'night';
      for (const c of CLOUDS) {
        const cx2 = c.x * w, cy = c.y * h;
        const s = Math.min(w, h) * 0.04 * c.sx;
        ctx!.fillStyle = p.cloud;
        ctx!.globalAlpha = isNight ? 0.06 : 0.8;
        px(cx2 - s * 1.5, cy, s * 3, s * 0.5);
        px(cx2 - s * 0.9, cy - s * 0.35, s * 1.8, s * 0.45);
        px(cx2 - s * 0.3, cy - s * 0.6, s * 0.6, s * 0.3);
        ctx!.fillStyle = p.cloudLight;
        ctx!.globalAlpha = isNight ? 0.03 : 0.45;
        px(cx2 - s * 1.2, cy + s * 0.1, s * 2.4, s * 0.25);
      }
      ctx!.globalAlpha = 1;
    }

    /* ---- Far mountains (asymmetric) ---- */
    function drawMountains(p: P) {
      const baseY = h * 0.72;
      // Layer 1: far mountains — left is higher
      ctx!.fillStyle = p.mtnFar;
      ctx!.beginPath();
      ctx!.moveTo(0, baseY - h * 0.12);
      ctx!.lineTo(w * 0.05, baseY - h * 0.18);
      ctx!.lineTo(w * 0.12, baseY - h * 0.08);
      ctx!.lineTo(w * 0.20, baseY - h * 0.14);
      ctx!.lineTo(w * 0.30, baseY - h * 0.05);
      ctx!.lineTo(w * 0.42, baseY - h * 0.10);
      ctx!.lineTo(w * 0.52, baseY + h * 0.02);
      ctx!.lineTo(w * 0.60, baseY - h * 0.06);
      ctx!.lineTo(w * 0.72, baseY + h * 0.01);
      ctx!.lineTo(w * 0.80, baseY - h * 0.08);
      ctx!.lineTo(w * 0.90, baseY + h * 0.02);
      ctx!.lineTo(w, baseY - h * 0.03);
      ctx!.lineTo(w, h);
      ctx!.lineTo(0, h);
      ctx!.closePath();
      ctx!.fill();

      // Layer 2: mid mountains
      ctx!.fillStyle = p.mtnMid;
      ctx!.beginPath();
      ctx!.moveTo(0, baseY - h * 0.06);
      ctx!.lineTo(w * 0.08, baseY - h * 0.10);
      ctx!.lineTo(w * 0.16, baseY);
      ctx!.lineTo(w * 0.25, baseY - h * 0.07);
      ctx!.lineTo(w * 0.35, baseY + h * 0.02);
      ctx!.lineTo(w * 0.48, baseY - h * 0.04);
      ctx!.lineTo(w * 0.58, baseY + h * 0.03);
      ctx!.lineTo(w * 0.68, baseY - h * 0.03);
      ctx!.lineTo(w * 0.82, baseY + h * 0.01);
      ctx!.lineTo(w * 0.92, baseY - h * 0.05);
      ctx!.lineTo(w, baseY + h * 0.02);
      ctx!.lineTo(w, h);
      ctx!.lineTo(0, h);
      ctx!.closePath();
      ctx!.fill();
    }

    /* ---- Castle silhouette (off-center, behind terrain) ---- */
    function drawCastleSilhouette(p: P) {
      const baseY = h * 0.74;
      const cx2 = w * 0.38; // offset left of center
      const u = Math.max(2, Math.round(w / 400));

      ctx!.fillStyle = p.castle;

      // Tall main spire
      px(cx2 - u * 4, baseY - h * 0.22, u * 8, h * 0.22);
      ctx!.beginPath();
      ctx!.moveTo(cx2 - u * 3, baseY - h * 0.22);
      ctx!.lineTo(cx2, baseY - h * 0.32);
      ctx!.lineTo(cx2 + u * 3, baseY - h * 0.22);
      ctx!.closePath();
      ctx!.fill();

      // Left wider section
      px(cx2 - u * 14, baseY - h * 0.13, u * 10, h * 0.13);
      ctx!.beginPath();
      ctx!.moveTo(cx2 - u * 14, baseY - h * 0.13);
      ctx!.lineTo(cx2 - u * 10, baseY - h * 0.18);
      ctx!.lineTo(cx2 - u * 6, baseY - h * 0.13);
      ctx!.closePath();
      ctx!.fill();

      // Right tower (shorter)
      px(cx2 + u * 6, baseY - h * 0.10, u * 6, h * 0.10);
      ctx!.beginPath();
      ctx!.moveTo(cx2 + u * 6, baseY - h * 0.10);
      ctx!.lineTo(cx2 + u * 9, baseY - h * 0.15);
      ctx!.lineTo(cx2 + u * 12, baseY - h * 0.10);
      ctx!.closePath();
      ctx!.fill();

      // Connecting wall
      px(cx2 + u * 12, baseY - h * 0.06, u * 8, h * 0.06);

      // Far right small turret
      px(cx2 + u * 18, baseY - h * 0.08, u * 4, h * 0.08);

      // Battlements
      for (let bx = cx2 - u * 4; bx < cx2 + u * 4; bx += u * 2.5) {
        px(bx, baseY - h * 0.22 - u * 2, u * 1.5, u * 2);
      }

      ctx!.fillStyle = p.castleLight;
      px(cx2 + u * 1, baseY - h * 0.22, u * 3, h * 0.22);
    }

    /* ---- Terrain fill (the rolling hills that everything sits on) ---- */
    function drawTerrain(p: P) {
      const groundBase = h * 0.88;

      // Draw the terrain shape
      ctx!.fillStyle = p.hillFar;
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      for (let i = 0; i <= 100; i++) {
        const xf = i / 100;
        const yOff = terrainAt(xf);
        ctx!.lineTo(xf * w, groundBase - yOff * h);
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fill();

      // Slightly lighter top strip
      ctx!.fillStyle = p.hillNear;
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      for (let i = 0; i <= 100; i++) {
        const xf = i / 100;
        const yOff = terrainAt(xf);
        ctx!.lineTo(xf * w, groundBase - yOff * h + h * 0.015);
      }
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fill();

      // Ground base
      ctx!.fillStyle = p.ground;
      ctx!.fillRect(0, h * 0.94, w, h * 0.06);
    }

    /* ---- Houses sitting on terrain ---- */
    function drawHouses(p: P, t: number) {
      const groundBase = h * 0.88;
      const u = Math.max(2, Math.round(w / 400));
      const isNight = time === 'night';

      for (const house of HOUSES) {
        const hx = house.x * w;
        const terrY = groundBase - terrainAt(house.x) * h + h * 0.06; // sink into terrain
        const bw = u * (house.isTower ? (8 + house.wScale * 5) : (10 + house.wScale * 8));
        const bh = u * (house.isTower ? (16 + house.hScale * 14) : (8 + house.hScale * 10));
        const top = terrY - bh;

        // Wall
        ctx!.fillStyle = p.wallDark;
        px(hx, top, bw * 0.5, bh);
        ctx!.fillStyle = p.wallLight;
        px(hx + bw * 0.5, top, bw * 0.5, bh);

        // Roof
        const roofH = bh * (house.roofStyle === 1 ? 0.7 : 0.45);
        ctx!.fillStyle = p.roofDark;
        ctx!.beginPath();
        ctx!.moveTo(hx - u * 2, top);
        ctx!.lineTo(hx + bw * 0.5, top - roofH);
        ctx!.lineTo(hx + bw + u * 2, top);
        ctx!.closePath();
        ctx!.fill();
        ctx!.fillStyle = p.roofLight;
        ctx!.beginPath();
        ctx!.moveTo(hx + bw * 0.4, top);
        ctx!.lineTo(hx + bw * 0.5, top - roofH);
        ctx!.lineTo(hx + bw + u * 2, top);
        ctx!.closePath();
        ctx!.fill();

        // Chimney
        if (house.chimney) {
          ctx!.fillStyle = p.wallDark;
          px(hx + bw * 0.65, top - roofH * 0.4, u * 2.5, roofH * 0.4 + u);
        }

        // Windows
        const winSpace = bw / (house.wins + 1);
        for (let wi = 0; wi < house.wins; wi++) {
          const wx = hx + winSpace * (wi + 1) - u;
          const wy = top + bh * 0.3;
          const ww = u * 2;
          const wh = u * 3;

          if (isNight) {
            const alpha = 0.5 + 0.5 * Math.sin(t * 0.006 + house.x * 10 + wi);
            ctx!.fillStyle = p.windowAura;
            ctx!.globalAlpha = alpha;
            px(wx - u, wy - u, ww + u * 2, wh + u * 2);
            ctx!.fillStyle = p.windowBright;
            ctx!.globalAlpha = alpha * 0.8;
            px(wx, wy, ww, wh);
            ctx!.fillStyle = p.windowGlow;
            ctx!.globalAlpha = alpha;
            px(wx, wy, ww, wh);
            ctx!.globalAlpha = 1;
          } else {
            ctx!.fillStyle = p.windowGlow;
            ctx!.globalAlpha = 0.6;
            px(wx, wy, ww, wh);
            ctx!.globalAlpha = 1;
          }
        }

        // Tower second window row
        if (house.isTower && bh > u * 20) {
          for (let wi = 0; wi < Math.min(house.wins, 2); wi++) {
            const wx = hx + winSpace * (wi + 1) - u;
            const wy = top + bh * 0.6;
            const ww = u * 2;
            const wh = u * 3;
            if (isNight) {
              const alpha = 0.4 + 0.6 * Math.sin(t * 0.005 + house.x * 7 + wi + 2);
              ctx!.fillStyle = p.windowAura;
              ctx!.globalAlpha = alpha;
              px(wx - u, wy - u, ww + u * 2, wh + u * 2);
              ctx!.fillStyle = p.windowGlow;
              ctx!.globalAlpha = alpha;
              px(wx, wy, ww, wh);
              ctx!.globalAlpha = 1;
            } else {
              ctx!.fillStyle = p.windowGlow;
              ctx!.globalAlpha = 0.5;
              px(wx, wy, ww, wh);
              ctx!.globalAlpha = 1;
            }
          }
        }
      }
    }

    /* ---- Trees sitting on terrain ---- */
    function drawTrees(p: P) {
      const groundBase = h * 0.88;
      const u = Math.max(2, Math.round(w / 400));

      for (const tree of TREES) {
        const tx = tree.x * w;
        const terrY = groundBase - terrainAt(tree.x) * h + h * 0.04; // sink into terrain
        const s = u * (4 + tree.s * 4);

        // Trunk
        ctx!.fillStyle = p.treeDark;
        px(tx - u, terrY - s * 0.4, u * 2, s * 0.5);

        if (tree.style === 0) {
          // Pointed pine — 3 layered triangles
          for (let layer = 0; layer < 3; layer++) {
            const ly = terrY - s * (0.3 + layer * 0.3);
            const lw = s * (0.55 - layer * 0.1);
            ctx!.fillStyle = layer === 0 ? p.treeDark : (layer === 1 ? p.treeMid : p.treeLight);
            ctx!.beginPath();
            ctx!.moveTo(tx - lw, ly);
            ctx!.lineTo(tx, ly - s * 0.35);
            ctx!.lineTo(tx + lw, ly);
            ctx!.closePath();
            ctx!.fill();
          }
        } else {
          // Round bush tree
          ctx!.fillStyle = p.treeDark;
          px(tx - s * 0.45, terrY - s * 0.8, s * 0.9, s * 0.5);
          px(tx - s * 0.3, terrY - s * 1.0, s * 0.6, s * 0.3);
          ctx!.fillStyle = p.treeMid;
          px(tx, terrY - s * 0.8, s * 0.4, s * 0.5);
        }
      }
    }

    let tick = 0;

    function draw() {
      ctx!.clearRect(0, 0, w, h);
      tick++;
      const p = time === 'night' ? NIGHT : DAY;

      drawSky(p);
      drawStars(p, tick);
      drawClouds(p);
      drawMountains(p);
      drawCastleSilhouette(p);
      drawHouses(p, tick);
      drawTrees(p);
      drawTerrain(p);

      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [time]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
