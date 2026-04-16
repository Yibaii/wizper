#!/usr/bin/env node
/**
 * Reproduce the client and contract message computation to find where they
 * diverge. Uses actual parameters from the failed mint attempt.
 */
import { encodeAbiParameters, keccak256, toHex, pad } from 'viem';

const stealthOwner  = '0xC1AAa56afc0Dd74DEFA927e0A0C138321E326579';
const tokenURI      = 'data:application/json;base64,eyJuYW1lIjoiV2l6cGVyIFBPQyBTcGlyaXQiLCJkZXNjcmlwdGlvbiI6ImVtb3Rpb246IHNhZG5lc3MiLCJpbWFnZSI6IiIsImF0dHJpYnV0ZXMiOlt7InRyYWl0X3R5cGUiOiJlbW90aW9uIiwidmFsdWUiOiJzYWRuZXNzIn1dfQ==';
const expressionHash = '0x1919af7376f4a441bf55b5cf6568126af5e14d2a3f5dcb03a077474a897af3a0';
const emotion = 'sadness';

const proofMessage = 86979906087889677583008638838393485425383148574560025179909870712460200726564n;

// ── what client computes ─────────────────────────────────────
const encoded = encodeAbiParameters(
  [
    { type: 'address' },
    { type: 'string' },
    { type: 'bytes32' },
    { type: 'string' },
  ],
  [stealthOwner, tokenURI, expressionHash, emotion],
);
const rawMsg = BigInt(keccak256(encoded));
console.log('rawMsg                      =', rawMsg.toString());
console.log('rawMsg hex                  =', keccak256(encoded));

// Semaphore's internal hash: keccak256(pad(raw,32)) >> 8
const padded = pad(toHex(rawMsg), { size: 32 });
const semaphoreHashed = BigInt(keccak256(padded)) >> 8n;
console.log('semaphore-hashed            =', semaphoreHashed.toString());

console.log('');
console.log('proof.message (from failed) =', proofMessage.toString());
console.log('');
console.log('match:', semaphoreHashed === proofMessage ? 'YES' : 'NO');

// If they don't match, also dump the encoded preimage bytes for comparison
if (semaphoreHashed !== proofMessage) {
  console.log('');
  console.log('abi.encode preimage (hex):');
  console.log(encoded);
  console.log('length:', (encoded.length - 2) / 2, 'bytes');
}
