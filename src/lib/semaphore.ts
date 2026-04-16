/**
 * Semaphore identity + proof helpers for Wizper anonymous posting.
 *
 * This module is browser-only: identity secrets live in localStorage.
 * Call-sites that may run on the server must guard with typeof window !== 'undefined'.
 */
import { Identity } from '@semaphore-protocol/identity';
import { Group } from '@semaphore-protocol/group';
import { generateProof, type SemaphoreProof } from '@semaphore-protocol/proof';
import { keccak256, encodeAbiParameters, pad, toHex, type Hex } from 'viem';

const IDENTITY_KEY = 'wizper_semaphore_identity_v1';
const POSTS_KEY = 'wizper_local_posts_v1';

// BN254 scalar field (< 2^254). Semaphore's internal hash returns
// keccak256(pad32(value)) >> 8, which fits in this field by construction.
export const SNARK_SCALAR_FIELD = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617',
);

// ─── Identity persistence ──────────────────────────────────────────────

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function loadIdentity(): Identity | null {
  if (!isBrowser()) return null;
  const exported = localStorage.getItem(IDENTITY_KEY);
  if (!exported) return null;
  try {
    return Identity.import(exported);
  } catch {
    return null;
  }
}

export function createIdentity(): Identity {
  const id = new Identity();
  if (isBrowser()) localStorage.setItem(IDENTITY_KEY, id.export());
  return id;
}

export function getOrCreateIdentity(): Identity {
  return loadIdentity() ?? createIdentity();
}

export function exportIdentitySecret(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(IDENTITY_KEY);
}

export function importIdentitySecret(base64: string): Identity {
  const id = Identity.import(base64);
  if (isBrowser()) localStorage.setItem(IDENTITY_KEY, base64);
  return id;
}

export function clearIdentity(): void {
  if (isBrowser()) localStorage.removeItem(IDENTITY_KEY);
}

// ─── Local post log ────────────────────────────────────────────────────

export interface LocalPost {
  expressionId: string;      // client-generated id (same as current app)
  tokenId?: string;          // on-chain token id once mint confirmed
  expressionHash: Hex;       // keccak256(text)
  stealthAddress: Hex;       // owner on-chain
  tokenURI: string;          // IPFS URI
  emotion: string;
  createdAt: string;         // ISO timestamp
  txHash?: Hex;              // mint tx hash
}

export function getLocalPosts(): LocalPost[] {
  if (!isBrowser()) return [];
  const raw = localStorage.getItem(POSTS_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function saveLocalPost(post: LocalPost): void {
  if (!isBrowser()) return;
  const all = getLocalPosts();
  const idx = all.findIndex(p => p.expressionId === post.expressionId);
  if (idx >= 0) all[idx] = { ...all[idx], ...post };
  else all.push(post);
  localStorage.setItem(POSTS_KEY, JSON.stringify(all));
}

// ─── Group construction ────────────────────────────────────────────────

/**
 * Build a Group from a list of identity commitments.
 * In production the list comes from on-chain MemberAdded events, ordered.
 */
export function buildGroup(commitments: (bigint | string)[]): Group {
  const group = new Group();
  for (const c of commitments) {
    const v = typeof c === 'string' ? BigInt(c) : c;
    group.addMember(v);
  }
  return group;
}

// ─── Message / scope hashing ───────────────────────────────────────────
//
// Semaphore v4 internally applies one more hash step to message/scope:
//   field_value = uint256(keccak256(bytes32(raw))) >> 8
//
// We pre-compute a `raw` 256-bit value here, pass it to generateProof as a
// bigint, and the proof library applies that final hash. The on-chain
// contract mirrors the same computation so `proof.message` and
// `proof.scope` match exactly.

/**
 * Raw (pre-Semaphore-hash) message binding for a mint.
 * Mirror in Solidity:
 *   uint256(keccak256(abi.encode(stealthOwner, tokenURI, expressionHash, emotion)))
 */
export function mintMessageRaw(args: {
  stealthAddress: Hex;
  tokenURI: string;
  expressionHash: Hex;
  emotion: string;
}): bigint {
  const encoded = encodeAbiParameters(
    [
      { type: 'address' },
      { type: 'string' },
      { type: 'bytes32' },
      { type: 'string' },
    ],
    [args.stealthAddress, args.tokenURI, args.expressionHash, args.emotion],
  );
  return BigInt(keccak256(encoded));
}

/**
 * Raw scope for mint: expression hash as bigint.
 * Using the expression hash as scope means the same identity cannot
 * mint the same text twice (nullifier collision) — a natural de-dupe.
 *
 * Mirror in Solidity:
 *   uint256(expressionHash)
 */
export function mintScopeRaw(expressionHash: Hex): bigint {
  return BigInt(expressionHash);
}

/**
 * Recompute what Semaphore's proof lib does to a raw 256-bit value
 * before feeding it to the circuit. Exposed for debugging / matching
 * with the contract.
 */
export function semaphoreInternalHash(raw: bigint): bigint {
  const padded = pad(toHex(raw), { size: 32 });
  const h = BigInt(keccak256(padded));
  return h >> BigInt(8);
}

// ─── Proof generation ──────────────────────────────────────────────────

export interface MintProofInput {
  identity: Identity;
  group: Group;
  stealthAddress: Hex;
  tokenURI: string;
  expressionHash: Hex;
  emotion: string;
}

export interface MintProofBundle {
  proof: SemaphoreProof;
  /** Hex string (0x...) of the proof message — same value the contract will check. */
  messageRaw: bigint;
  scopeRaw: bigint;
}

/**
 * Generate a Semaphore proof for an anonymous mint.
 * Runs in the browser; takes 2–6 seconds depending on device.
 */
export async function proveMint(input: MintProofInput): Promise<MintProofBundle> {
  const messageRaw = mintMessageRaw(input);
  const scopeRaw = mintScopeRaw(input.expressionHash);

  const proof = await generateProof(
    input.identity,
    input.group,
    messageRaw,
    scopeRaw,
  );

  return { proof, messageRaw, scopeRaw };
}
