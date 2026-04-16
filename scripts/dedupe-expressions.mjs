#!/usr/bin/env node
/**
 * One-shot cleanup: remove Expression rows that have null tokenId when a
 * sibling row for the same on-chain spirit exists (by owner + text match).
 *
 * After the recover script ran, we likely have duplicates: the legacy rows
 * (written by old mintExpressionNFT) have null tokenId; the recovered rows
 * have tokenId set. Prefer the recovered one and delete the stale one.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

try {
  const text = readFileSync('.env.local', 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* optional */ }

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.expression.findMany({
    orderBy: { createdAt: 'asc' },
  });

  // Group by (owner, text) — duplicates are the same author's same message.
  const buckets = new Map();
  for (const e of all) {
    const key = `${e.owner}::${e.text}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(e);
  }

  let deleted = 0;
  for (const [key, rows] of buckets) {
    if (rows.length < 2) continue;
    // Prefer the one with tokenId set; delete the others.
    const keep = rows.find(r => r.tokenId) ?? rows[rows.length - 1];
    const drop = rows.filter(r => r.id !== keep.id);

    for (const d of drop) {
      // Also detach any Link rows referencing this id.
      await prisma.link.deleteMany({
        where: { OR: [{ fromId: d.id }, { toId: d.id }] },
      });
      await prisma.expression.delete({ where: { id: d.id } });
      deleted += 1;
      console.log(`  deleted ${d.id} (kept ${keep.id} [${keep.emotion}])`);
    }
  }

  console.log(`\nDeleted ${deleted} duplicate expression(s).`);

  // Also look for orphan legacy rows — no tokenId AND owner is not any
  // stealth address we have a record of. Probably real leftovers from the
  // old flow. Just list them; don't auto-delete.
  const orphans = await prisma.expression.findMany({
    where: { tokenId: null, minted: true },
  });
  if (orphans.length) {
    console.log(`\n${orphans.length} minted row(s) still have null tokenId:`);
    for (const o of orphans) {
      console.log(`  ${o.id} owner=${o.owner} "${o.text.slice(0, 30)}"`);
    }
    console.log('(kept; may be genuine old-flow records from a previous contract)');
  }

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
