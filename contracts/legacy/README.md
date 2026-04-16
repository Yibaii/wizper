# Legacy Contracts (v0)

Artifacts from the original Wizper architecture. **Not used by the current frontend.** Kept as reference for the ZK-anonymity evolution described in [../../README.legacy.md](../../README.legacy.md).

| File | Role in v0 |
|---|---|
| `WizperNFT.sol` | ERC-721 for expressions, owned by the user's main wallet. Replaced by [`../WizperAnonymous.sol`](../WizperAnonymous.sol) where NFTs are owned by a stealth address. |
| `WizperZKVerifier.sol` | Hash-based commitment scheme: `keccak256(hash, nullifier, author)`. Provided "prove authorship later" but the author was already pinned to the main wallet at mint time, so the guarantee was weaker than real anonymity. Replaced by Semaphore membership proofs. |
| `DEPLOY_GUIDE.md` | Remix deployment walkthrough for the three v0 contracts. |

The v0 token contract (`WizperToken.sol`) is **not** in this folder because the home page still uses its `claimDailyReward()` function. If the daily-reward UX is ever removed, `WizperToken.sol` can join this graveyard.

Do not deploy these. Do not import them from the frontend.
