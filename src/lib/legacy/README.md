# Legacy Libraries (v0)

TypeScript helpers from the original Wizper architecture. **Not imported by current code.** Preserved for reference.

| File | Role in v0 |
|---|---|
| `zk.ts` | Hash-commitment ZK helpers (`generateNullifier`, `createCommitment`, `saveNullifier`). Used by the old `mintExpressionNFT` flow that signed three transactions from the main wallet and stored a commitment on `WizperZKVerifier`. |

Replaced by [`../semaphore.ts`](../semaphore.ts) (Semaphore identity + proof generation) and [`../stealth.ts`](../stealth.ts) (stealth address derivation).

Do not import from here.
