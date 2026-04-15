import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/expressions/mine?owner=0x... — Get user's own expressions
export async function GET(req: NextRequest) {
  const owner = req.nextUrl.searchParams.get('owner');

  if (!owner) {
    return NextResponse.json({ error: 'Missing owner' }, { status: 400 });
  }

  const expressions = await prisma.expression.findMany({
    where: { owner: owner.toLowerCase() },
    orderBy: { createdAt: 'desc' },
    include: {
      links: { select: { id: true, toId: true, status: true } },
      linkedBy: { select: { id: true, fromId: true, status: true } },
    },
  });

  return NextResponse.json(expressions);
}
