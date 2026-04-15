import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/links — Get all links
export async function GET() {
  const links = await prisma.link.findMany({
    orderBy: { id: 'desc' },
  });
  return NextResponse.json(links);
}

// POST /api/links — Create link request
export async function POST(req: NextRequest) {
  const { fromId, toId } = await req.json();

  if (!fromId || !toId) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const id = `l-${Date.now()}`;
  const link = await prisma.link.create({
    data: { id, fromId, toId, status: 'pending' },
  });

  return NextResponse.json(link);
}

// PATCH /api/links — Confirm a link
export async function PATCH(req: NextRequest) {
  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const link = await prisma.link.update({
    where: { id },
    data: { status: 'confirmed' },
  });

  return NextResponse.json(link);
}
