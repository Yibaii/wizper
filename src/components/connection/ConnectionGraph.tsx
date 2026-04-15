'use client';

import { useRef, useEffect, useCallback } from 'react';
import { textToCreature, PALETTES } from '@/lib/emotions';
import { hashString } from '@/lib/emotions';
import type { Confession, Link } from '@/data/mock';

interface Props {
  confessions: Confession[];
  links: Link[];
}

interface Node {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  glow: string;
  text: string;
  radius: number;
}

interface Edge {
  from: string;
  to: string;
  status: 'confirmed' | 'pending';
}

export default function ConnectionGraph({ confessions, links }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const hoveredRef = useRef<string | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  const initGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    // Only include confessions that are part of links
    const linkedIds = new Set<string>();
    links.forEach(l => {
      linkedIds.add(l.fromId);
      linkedIds.add(l.toId);
    });

    // Also add some extra nodes for visual richness
    const linked = confessions.filter(c => linkedIds.has(c.id));
    const unlinked = confessions.filter(c => !linkedIds.has(c.id)).slice(0, 4);
    const visible = [...linked, ...unlinked];

    nodesRef.current = visible.map((c, i) => {
      const creature = textToCreature(c.text);
      const angle = (i / visible.length) * Math.PI * 2;
      const dist = 120 + Math.random() * 80;
      return {
        id: c.id,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        color: creature.palette.primary,
        glow: creature.palette.glow,
        text: c.text,
        radius: linkedIds.has(c.id) ? 18 : 12,
      };
    });

    edgesRef.current = links.map(l => ({
      from: l.fromId,
      to: l.toId,
      status: l.status,
    }));
  }, [confessions, links]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
      initGraph();
    }

    resize();
    window.addEventListener('resize', resize);

    // Mouse tracking
    function onMouseMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      // Check hover
      hoveredRef.current = null;
      for (const node of nodesRef.current) {
        const dx = mouseRef.current.x - node.x;
        const dy = mouseRef.current.y - node.y;
        if (Math.sqrt(dx * dx + dy * dy) < node.radius + 5) {
          hoveredRef.current = node.id;
          break;
        }
      }
    }
    canvas.addEventListener('mousemove', onMouseMove);

    let time = 0;

    function simulate() {
      const nodes = nodesRef.current;
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      // Force-directed layout
      for (let i = 0; i < nodes.length; i++) {
        // Repulsion from other nodes
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
          const force = 800 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }

        // Center gravity
        const dx = w / 2 - nodes[i].x;
        const dy = h / 2 - nodes[i].y;
        nodes[i].vx += dx * 0.001;
        nodes[i].vy += dy * 0.001;
      }

      // Spring forces along edges
      for (const edge of edgesRef.current) {
        const a = nodes.find(n => n.id === edge.from);
        const b = nodes.find(n => n.id === edge.to);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const targetDist = edge.status === 'confirmed' ? 140 : 180;
        const force = (dist - targetDist) * 0.003;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }

      // Apply velocity + damping
      for (const node of nodes) {
        node.vx *= 0.9;
        node.vy *= 0.9;
        node.x += node.vx;
        node.y += node.vy;
        // Boundary
        node.x = Math.max(30, Math.min(w - 30, node.x));
        node.y = Math.max(30, Math.min(h - 30, node.y));
      }
    }

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx!.clearRect(0, 0, w, h);
      time += 1;

      simulate();

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Draw edges
      for (const edge of edges) {
        const a = nodes.find(n => n.id === edge.from);
        const b = nodes.find(n => n.id === edge.to);
        if (!a || !b) continue;

        ctx!.beginPath();
        ctx!.moveTo(a.x, a.y);
        ctx!.lineTo(b.x, b.y);

        if (edge.status === 'confirmed') {
          ctx!.strokeStyle = '#00f5d4';
          ctx!.globalAlpha = 0.4 + 0.2 * Math.sin(time * 0.03);
          ctx!.lineWidth = 2;
          ctx!.setLineDash([]);
        } else {
          ctx!.strokeStyle = '#ffd700';
          ctx!.globalAlpha = 0.25 + 0.15 * Math.sin(time * 0.05);
          ctx!.lineWidth = 1;
          ctx!.setLineDash([4, 4]);
        }
        ctx!.stroke();
        ctx!.setLineDash([]);

        // Traveling particle along confirmed edges
        if (edge.status === 'confirmed') {
          const t = ((time * 0.01) % 1);
          const px = a.x + (b.x - a.x) * t;
          const py = a.y + (b.y - a.y) * t;
          ctx!.beginPath();
          ctx!.arc(px, py, 2, 0, Math.PI * 2);
          ctx!.fillStyle = '#00f5d4';
          ctx!.globalAlpha = 0.8;
          ctx!.fill();
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const isHovered = hoveredRef.current === node.id;
        const r = isHovered ? node.radius * 1.3 : node.radius;

        // Glow
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
        ctx!.fillStyle = node.glow;
        ctx!.globalAlpha = 0.06 + (isHovered ? 0.08 : 0);
        ctx!.fill();

        // Body
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = node.color;
        ctx!.globalAlpha = 0.85;
        ctx!.fill();

        // Border
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx!.strokeStyle = node.color;
        ctx!.globalAlpha = 0.4;
        ctx!.lineWidth = 1;
        ctx!.stroke();

        // Eyes (simple dots)
        ctx!.globalAlpha = 1;
        ctx!.fillStyle = '#0a0a1a';
        ctx!.fillRect(node.x - 4, node.y - 2, 3, 3);
        ctx!.fillRect(node.x + 2, node.y - 2, 3, 3);
      }

      // Draw hovered tooltip
      if (hoveredRef.current) {
        const node = nodes.find(n => n.id === hoveredRef.current);
        if (node) {
          const label = node.text.slice(0, 30) + (node.text.length > 30 ? '…' : '');
          ctx!.globalAlpha = 0.9;
          ctx!.font = '10px "Press Start 2P", monospace';
          const metrics = ctx!.measureText(label);
          const tw = metrics.width + 16;
          const tx = node.x - tw / 2;
          const ty = node.y - node.radius - 30;

          // Background
          ctx!.fillStyle = '#1a0a2e';
          ctx!.fillRect(tx, ty, tw, 20);
          ctx!.strokeStyle = '#b24bf3';
          ctx!.lineWidth = 1;
          ctx!.strokeRect(tx, ty, tw, 20);

          // Text
          ctx!.fillStyle = '#e0e0e0';
          ctx!.globalAlpha = 1;
          ctx!.fillText(label, tx + 8, ty + 14);
        }
      }

      ctx!.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [initGraph]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ minHeight: '500px' }}
    />
  );
}
