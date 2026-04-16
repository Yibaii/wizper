/**
 * Link signing for Wizper anonymous NFTs.
 *
 * Links are proven via plain ECDSA signatures from the stealth address
 * (derived from the user's Semaphore identity in `src/lib/stealth.ts`).
 * No extra ZK is required: the stealth address is already public as the
 * NFT's `ownerOf(tokenId)`, and the stealth key never touches a regular
 * wallet UI — it's used programmatically to produce these signatures.
 *
 * Signature scheme:
 *   digest = keccak256(abi.encode(TYPEHASH, chainId, contract, from, to))
 *   signature = personal_sign(digest)  // EIP-191 prefix
 *
 * The contract re-derives the digest, applies the same EIP-191 prefix,
 * recovers the signer, and checks it matches ownerOf(tokenId).
 */
import {
  keccak256,
  encodeAbiParameters,
  toBytes,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type { Identity } from '@semaphore-protocol/identity';
import { deriveStealthPrivateKey } from '@/lib/stealth';

// Must match constants in WizperAnonymous.sol
export const LINK_REQUEST_TYPEHASH = keccak256(toBytes('Wizper.LinkRequest'));
export const LINK_CONFIRM_TYPEHASH = keccak256(toBytes('Wizper.LinkConfirm'));

export interface LinkSignContext {
  identity: Identity;
  chainId: number;
  contractAddress: Hex;
  fromTokenId: bigint;
  toTokenId: bigint;
}

function linkDigest(typehash: Hex, ctx: LinkSignContext): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'bytes32' },
        { type: 'uint256' },
        { type: 'address' },
        { type: 'uint256' },
        { type: 'uint256' },
      ],
      [typehash, BigInt(ctx.chainId), ctx.contractAddress, ctx.fromTokenId, ctx.toTokenId],
    ),
  );
}

/**
 * Deterministic link id, mirroring WizperAnonymous.linkId():
 *   keccak256(abi.encode(from, to))
 * Order matters — (A, B) and (B, A) are different links.
 */
export function linkId(fromTokenId: bigint, toTokenId: bigint): Hex {
  return keccak256(
    encodeAbiParameters(
      [{ type: 'uint256' }, { type: 'uint256' }],
      [fromTokenId, toTokenId],
    ),
  );
}

/**
 * Sign a link request with the caller's stealth key. Must be the identity
 * corresponding to the stealth address that owns `fromTokenId`.
 */
export async function signLinkRequest(ctx: LinkSignContext): Promise<Hex> {
  const pk = deriveStealthPrivateKey(ctx.identity);
  const account = privateKeyToAccount(pk);
  const digest = linkDigest(LINK_REQUEST_TYPEHASH, ctx);
  // viem's signMessage with { raw } applies the "\x19Ethereum Signed Message:\n32"
  // prefix before signing the 32-byte digest — this matches the contract's
  // MessageHashUtils.toEthSignedMessageHash flow.
  return account.signMessage({ message: { raw: digest } });
}

/**
 * Sign a link confirmation with the caller's stealth key. Must be the
 * identity corresponding to the stealth address that owns `toTokenId`.
 */
export async function signLinkConfirm(ctx: LinkSignContext): Promise<Hex> {
  const pk = deriveStealthPrivateKey(ctx.identity);
  const account = privateKeyToAccount(pk);
  const digest = linkDigest(LINK_CONFIRM_TYPEHASH, ctx);
  return account.signMessage({ message: { raw: digest } });
}
