#!/usr/bin/env node
/**
 * One-shot helper: generate a fresh relayer hot wallet for the Wizper POC.
 *
 * Usage:
 *   node scripts/gen-relayer.mjs
 *
 * Prints the private key and the matching address. Copy them somewhere safe
 * (and into .env.local). Do NOT commit the private key.
 */
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

const pk = generatePrivateKey();
const account = privateKeyToAccount(pk);

console.log('');
console.log('  RELAYER_PRIVATE_KEY = ' + pk);
console.log('  address             = ' + account.address);
console.log('');
console.log('Next steps:');
console.log('  1. Add RELAYER_PRIVATE_KEY to .env.local');
console.log('  2. Fund the address above with ~0.05 Base Sepolia ETH');
console.log('     Faucet: https://docs.base.org/docs/tools/network-faucets');
console.log('  3. Verify the balance on https://sepolia.basescan.org/address/' + account.address);
console.log('');
