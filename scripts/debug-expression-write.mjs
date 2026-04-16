#!/usr/bin/env node
/**
 * Repro the POST /api/expressions write directly against Prisma to see
 * the real error without going through Next.js.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const id = `c-debug-${Date.now()}`;
const record = {
  id,
  text: 'diagnostic',
  emotion: 'joy',
  owner: '0x04df0000000000000000000000000000000000a230',
  minted: true,
  mintedAt: new Date(),
  tokenId: '99999',
  tokenURI: 'ipfs://test',
  txHash: '0xdeadbeef',
};

try {
  const row = await prisma.expression.create({ data: record });
  console.log('OK:', row);
  await prisma.expression.delete({ where: { id } });
  console.log('cleaned up');
} catch (err) {
  console.error('FAIL:');
  console.error(err);
} finally {
  await prisma.$disconnect();
}
