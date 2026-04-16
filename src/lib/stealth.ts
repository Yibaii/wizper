/**
 * Stealth address derivation from a Semaphore identity.
 *
 * A Wizper user's Semaphore identity (stored in localStorage) is used to
 * deterministically derive a separate Ethereum account that owns their NFTs.
 *
 *     identity secret  ─►  keccak256(domain + secret)  ─►  stealth private key
 *                                                                │
 *                                                                ▼
 *                                                         stealth address
 *
 * Properties:
 *   - Only the holder of the identity secret can reproduce the stealth key.
 *   - The stealth address has NO on-chain link to the user's main wallet.
 *   - The stealth address holds the user's NFTs and is the formal `owner`
 *     on-chain — but observers cannot link it back to any known identity.
 *   - Since the key is derived (not stored separately), losing the identity
 *     secret loses access to all NFTs. There is no recovery path.
 */
import { keccak256, stringToBytes, concat, type Hex } from 'viem';
import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import type { Identity } from '@semaphore-protocol/identity';

const DOMAIN = 'wizper-stealth-v1';

/**
 * Derive a deterministic viem account from a Semaphore identity.
 * The same identity always produces the same stealth account.
 */
export function deriveStealthAccount(identity: Identity): PrivateKeyAccount {
  return privateKeyToAccount(deriveStealthPrivateKey(identity));
}

/**
 * Derive the raw 32-byte private key for the stealth account.
 * Exposed separately for cases where code needs to sign with the stealth key
 * (e.g. transferring an NFT) without reloading viem helpers.
 */
export function deriveStealthPrivateKey(identity: Identity): Hex {
  // identity.export() returns the private key as a base64 string that is
  // stable across calls for the same identity.
  const secretB64 = identity.export();
  const domainBytes = stringToBytes(DOMAIN + ':');
  const secretBytes = stringToBytes(secretB64);
  return keccak256(concat([domainBytes, secretBytes]));
}

/**
 * Convenience: derive just the 0x address.
 */
export function deriveStealthAddress(identity: Identity): `0x${string}` {
  return deriveStealthAccount(identity).address;
}
