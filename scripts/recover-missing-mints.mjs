#!/usr/bin/env node
/**
 * Scan SpiritMinted events on-chain and insert any records missing from DB.
 * Useful after a /api/expressions 500 that left a successful on-chain mint
 * without a DB cache entry.
 *
 * Usage: node scripts/recover-missing-mints.mjs
 *
 * Reads NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS, NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK
 * from .env.local.
 */
import 'dotenv/config';
import { readFileSync } from 'fs';
import { createPublicClient, http, parseAbi } from 'viem';
import { baseSepolia } from 'viem/chains';
import { PrismaClient } from '@prisma/client';

// Load .env.local (dotenv defaults to .env)
try {
  const text = readFileSync('.env.local', 'utf8');
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* .env.local optional */ }

const ANON_ADDRESS = process.env.NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS;
const DEPLOY_BLOCK = process.env.NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK
  ? BigInt(process.env.NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK)
  : null;

if (!ANON_ADDRESS) {
  console.error('NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS not set');
  process.exit(1);
}

const client = createPublicClient({ chain: baseSepolia, transport: http() });
const prisma = new PrismaClient();

const ABI = parseAbi([
  'event SpiritMinted(uint256 indexed tokenId, address indexed stealthOwner, bytes32 expressionHash, string emotion)',
  'function tokenURI(uint256 tokenId) view returns (string)',
]);

async function main() {
  const latest = await client.getBlockNumber();
  const startBlock = DEPLOY_BLOCK ?? (latest > 50000n ? latest - 50000n : 0n);
  console.log(`Scanning SpiritMinted from block ${startBlock} to ${latest}...`);

  const CHUNK = 9500n;
  const events = [];
  let cursor = startBlock;
  while (cursor <= latest) {
    const to = cursor + CHUNK > latest ? latest : cursor + CHUNK;
    const logs = await client.getLogs({
      address: ANON_ADDRESS,
      event: ABI[0],
      fromBlock: cursor,
      toBlock: to,
    });
    events.push(...logs);
    cursor = to + 1n;
  }
  console.log(`Found ${events.length} SpiritMinted event(s) on-chain.`);

  let recovered = 0;
  for (const log of events) {
    const { tokenId, stealthOwner, expressionHash, emotion } = log.args;
    const tokenIdStr = tokenId.toString();

    const existing = await prisma.expression.findFirst({
      where: { tokenId: tokenIdStr },
    });
    if (existing) {
      console.log(`  token ${tokenIdStr}: already in DB as ${existing.id}`);
      continue;
    }

    // Fetch tokenURI and IPFS metadata to recover text.
    let tokenURI = '';
    let text = `[recovered ${tokenIdStr}]`;
    try {
      tokenURI = await client.readContract({
        address: ANON_ADDRESS,
        abi: ABI,
        functionName: 'tokenURI',
        args: [tokenId],
      });
      if (tokenURI.startsWith('ipfs://')) {
        const cid = tokenURI.replace('ipfs://', '');
        const gateway = `https://gateway.pinata.cloud/ipfs/${cid}`;
        const res = await fetch(gateway);
        if (res.ok) {
          const meta = await res.json();
          text = meta?.wizper?.text ?? meta?.description ?? text;
        }
      }
    } catch (e) {
      console.warn(`  token ${tokenIdStr}: metadata fetch failed:`, e.message);
    }

    const id = `recovered-${tokenIdStr}`;
    await prisma.expression.create({
      data: {
        id,
        text,
        emotion,
        minted: true,
        mintedAt: new Date(Number(log.blockNumber) * 1000), // approx
        owner: stealthOwner.toLowerCase(),
        tokenId: tokenIdStr,
        tokenURI,
        txHash: log.transactionHash,
      },
    });
    console.log(`  token ${tokenIdStr}: recovered as ${id} (${emotion})`);
    recovered += 1;
  }

  console.log(`\nDone. Recovered ${recovered} spirit(s).`);
  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
