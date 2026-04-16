/**
 * POST /api/relay/mint
 *
 * Receives a Semaphore proof + mint parameters, submits mintSpirit on
 * WizperAnonymous paying gas from the server-held relayer wallet.
 *
 * The relayer sees:
 *   - IP (standard HTTP), stealth address, tokenURI, proof bytes
 * The relayer does NOT see:
 *   - Which identity produced the proof
 *   - Which main wallet the user owns
 *
 * Even if the relayer logs everything, it cannot deanonymize the user.
 *
 * Env required:
 *   RELAYER_PRIVATE_KEY             0x... funded hot wallet on the target chain
 *   NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS  deployed WizperAnonymous contract
 *   NEXT_PUBLIC_CHAIN_ID            84532 for Base Sepolia
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

// ─── Types for request payload ───────────────────────────────────

interface SemaphoreProofPayload {
  merkleTreeDepth: string;   // numeric strings from Semaphore
  merkleTreeRoot: string;
  nullifier: string;
  message: string;
  scope: string;
  points: string[];          // length 8
}

interface MintRequest {
  proof: SemaphoreProofPayload;
  stealthOwner: Hex;
  tokenURI: string;
  expressionHash: Hex;
  emotion: string;
}

// ─── Validation ──────────────────────────────────────────────────

function validate(body: unknown): MintRequest | string {
  if (!body || typeof body !== 'object') return 'bad body';
  const b = body as Record<string, unknown>;

  const proof = b.proof as Record<string, unknown> | undefined;
  if (!proof) return 'missing proof';
  for (const k of ['merkleTreeDepth', 'merkleTreeRoot', 'nullifier', 'message', 'scope'] as const) {
    if (typeof proof[k] !== 'string') return `proof.${k} must be string`;
  }
  if (!Array.isArray(proof.points) || proof.points.length !== 8) return 'proof.points must be length-8 array';
  if (!proof.points.every(p => typeof p === 'string')) return 'proof.points must be strings';

  if (typeof b.stealthOwner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(b.stealthOwner)) return 'bad stealthOwner';
  if (typeof b.tokenURI !== 'string' || b.tokenURI.length === 0) return 'bad tokenURI';
  if (typeof b.expressionHash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(b.expressionHash)) return 'bad expressionHash';
  if (typeof b.emotion !== 'string' || b.emotion.length === 0 || b.emotion.length > 32) return 'bad emotion';

  return body as unknown as MintRequest;
}

// ─── Handler ─────────────────────────────────────────────────────

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
      { error: 'relayer not configured (missing RELAYER_PRIVATE_KEY or contract address)' },
      { status: 500 },
    );
  }

  const account = privateKeyToAccount(relayerKey as Hex);
  const chain = baseSepolia; // POC is on Base Sepolia; swap for prod
  const rpc = http();

  const wallet = createWalletClient({ account, chain, transport: rpc });
  const publicClient = createPublicClient({ chain, transport: rpc });

  // Shape the proof tuple for viem. Semaphore gives us numeric strings,
  // viem accepts both string and bigint for uint256.
  const proofTuple = {
    merkleTreeDepth: BigInt(parsed.proof.merkleTreeDepth),
    merkleTreeRoot: BigInt(parsed.proof.merkleTreeRoot),
    nullifier: BigInt(parsed.proof.nullifier),
    message: BigInt(parsed.proof.message),
    scope: BigInt(parsed.proof.scope),
    points: parsed.proof.points.map(p => BigInt(p)) as [
      bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint,
    ],
  };

  const abi = parseAbi(WIZPER_ANONYMOUS_ABI as unknown as string[]);

  try {
    // Simulate first so we surface revert reasons cleanly.
    const { request } = await publicClient.simulateContract({
      account,
      address: contractAddr as Hex,
      abi,
      functionName: 'mintSpirit',
      args: [
        proofTuple,
        parsed.stealthOwner,
        parsed.tokenURI,
        parsed.expressionHash,
        parsed.emotion,
      ],
    });

    const hash = await wallet.writeContract(request);
    return NextResponse.json({ hash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[relay/mint] simulate/send failed:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
