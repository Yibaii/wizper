/**
 * POST /api/relay/link
 *
 * Single endpoint for both link request and link confirmation. Payload:
 *
 *   {
 *     kind: "request" | "confirm",
 *     fromTokenId: string,  // decimal or 0x-hex
 *     toTokenId: string,
 *     signature: `0x${string}`
 *   }
 *
 * Relayer validates, simulates, submits. Relayer cannot forge signatures
 * (signatures must recover to ownerOf(tokenId) on-chain), so there is no
 * trust placed in the relayer for integrity — only for availability.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseAbi,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { WIZPER_ANONYMOUS_ABI } from '@/lib/contracts/anonymousAbi';

export const runtime = 'nodejs';

type LinkKind = 'request' | 'confirm';

interface LinkRequestBody {
  kind: LinkKind;
  fromTokenId: string;
  toTokenId: string;
  signature: Hex;
}

function validate(body: unknown): LinkRequestBody | string {
  if (!body || typeof body !== 'object') return 'bad body';
  const b = body as Record<string, unknown>;

  if (b.kind !== 'request' && b.kind !== 'confirm') return 'kind must be request|confirm';
  if (typeof b.fromTokenId !== 'string') return 'bad fromTokenId';
  if (typeof b.toTokenId !== 'string') return 'bad toTokenId';
  if (typeof b.signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(b.signature)) return 'bad signature';
  try {
    BigInt(b.fromTokenId);
    BigInt(b.toTokenId);
  } catch {
    return 'token ids must be bigint-parseable';
  }

  return b as unknown as LinkRequestBody;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = validate(body);
  if (typeof parsed === 'string') {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const relayerKey = process.env.RELAYER_PRIVATE_KEY;
  const contractAddr = process.env.NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS;
  if (!relayerKey || !contractAddr) {
    return NextResponse.json(
      { error: 'relayer not configured' },
      { status: 500 },
    );
  }

  const account = privateKeyToAccount(relayerKey as Hex);
  const chain = baseSepolia;
  const rpc = http();
  const wallet = createWalletClient({ account, chain, transport: rpc });
  const publicClient = createPublicClient({ chain, transport: rpc });
  const abi = parseAbi(WIZPER_ANONYMOUS_ABI as unknown as string[]);

  const fromTokenId = BigInt(parsed.fromTokenId);
  const toTokenId = BigInt(parsed.toTokenId);
  const fnName = parsed.kind === 'request' ? 'requestLink' : 'confirmLink';

  try {
    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddr as Hex,
      abi,
      functionName: fnName,
      args: [fromTokenId, toTokenId, parsed.signature],
    });

    const hash = await wallet.writeContract(request);
    return NextResponse.json({ hash, kind: parsed.kind });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[relay/link:${parsed.kind}] failed:`, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
