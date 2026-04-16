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

// POST /api/expressions — Create new expression.
//
// Back-compat: the old flow POSTed with {id, text, emotion, owner} to create
// an un-minted draft; a subsequent PATCH would set minted=true + tokenURI.
//
// New anonymous flow POSTs the full minted record in one go with
// {id, text, emotion, owner: stealthAddress, minted: true, tokenURI, txHash}.
// Both shapes are accepted — extra fields are stored when present.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, text, emotion, owner, minted, tokenId, tokenURI, txHash } = body;

  if (!id || !text || !emotion || !owner) {
    return NextResponse.json({ error: 'Missing fields', got: { id, text: !!text, emotion, owner } }, { status: 400 });
  }

  const data: {
    id: string;
    text: string;
    emotion: string;
    owner: string;
    minted?: boolean;
    mintedAt?: Date;
    tokenId?: string;
    tokenURI?: string;
    txHash?: string;
  } = {
    id,
    text,
    emotion,
    owner: String(owner).toLowerCase(),
  };
  if (minted) {
    data.minted = true;
    data.mintedAt = new Date();
  }
  if (tokenId) data.tokenId = String(tokenId);
  if (tokenURI) data.tokenURI = tokenURI;
  if (txHash) data.txHash = txHash;

  try {
    const expression = await prisma.expression.create({ data });
    return NextResponse.json(expression);
  } catch (err) {
    console.error('[/api/expressions POST] prisma error:', err);
    console.error('  payload:', JSON.stringify(data));
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH /api/expressions — Update expression (mint, hide).
//
// Hide/unhide requires an owner match: the DB cache is public, but we don't
// want arbitrary callers to flip `hidden` on someone else's spirit. The
// check is: if `hidden` is in the payload, the caller must send `owner` and
// it must match the record's `owner`. This is a client-side cache guard,
// not a cryptographic proof — the real source of truth remains on-chain.
export async function PATCH(req: NextRequest) {
  const { id, minted, hidden, tokenId, tokenURI, txHash, owner } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  if (hidden !== undefined) {
    if (!owner) {
      return NextResponse.json({ error: 'owner required to change hidden' }, { status: 400 });
    }
    const existing = await prisma.expression.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (existing.owner !== owner.toLowerCase()) {
      return NextResponse.json({ error: 'Not your expression' }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {};
  if (minted !== undefined) {
    data.minted = minted;
    data.mintedAt = new Date();
  }
  if (hidden !== undefined) data.hidden = hidden;
  if (tokenId) data.tokenId = String(tokenId);
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
