import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/expressions — Feed: only minted & not hidden
export async function GET() {
  const expressions = await prisma.expression.findMany({
    where: { minted: true, hidden: false },
    orderBy: { createdAt: 'desc' },
    include: {
      links: { select: { id: true, toId: true, status: true } },
      linkedBy: { select: { id: true, fromId: true, status: true } },
    },
  });
  return NextResponse.json(expressions);
}

// POST /api/expressions — Create new expression (saved to DB, not minted)
export async function POST(req: NextRequest) {
  const { id, text, emotion, owner } = await req.json();

  if (!id || !text || !emotion || !owner) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const expression = await prisma.expression.create({
    data: {
      id,
      text,
      emotion,
      owner: owner.toLowerCase(),
    },
  });

  return NextResponse.json(expression);
}

// PATCH /api/expressions — Update expression (mint, hide)
export async function PATCH(req: NextRequest) {
  const { id, minted, hidden, tokenURI, txHash } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (minted !== undefined) {
    data.minted = minted;
    data.mintedAt = new Date();
  }
  if (hidden !== undefined) data.hidden = hidden;
  if (tokenURI) data.tokenURI = tokenURI;
  if (txHash) data.txHash = txHash;

  const expression = await prisma.expression.update({
    where: { id },
    data,
  });

  return NextResponse.json(expression);
}

// DELETE /api/expressions — Delete un-minted expression
export async function DELETE(req: NextRequest) {
  const { id, owner } = await req.json();

  if (!id || !owner) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  // Only allow deleting un-minted expressions owned by the caller
  const expression = await prisma.expression.findUnique({ where: { id } });

  if (!expression) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (expression.owner !== owner.toLowerCase()) {
    return NextResponse.json({ error: 'Not your expression' }, { status: 403 });
  }
  if (expression.minted) {
    return NextResponse.json({ error: 'Cannot delete minted expression' }, { status: 400 });
  }

  await prisma.expression.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
