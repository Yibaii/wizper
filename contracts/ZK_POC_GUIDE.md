# Wizper ZK Anonymous Mint — Phase 0 POC

This document walks through deploying and testing the anonymous-mint POC
that was added alongside the existing contracts. The goal of Phase 0 is
to prove the full plumbing works end-to-end on Base Sepolia before we
refactor the main app to use it.

## What was added

```
contracts/
  WizperAnonymous.sol            ← new contract: Semaphore-backed anonymous NFT

src/
  lib/
    stealth.ts                   ← derive stealth Ethereum account from identity
    semaphore.ts                 ← identity + proof helpers, localStorage-backed
  lib/contracts/
    anonymousAbi.ts              ← ABI for WizperAnonymous
  app/
    api/relay/mint/route.ts      ← relayer endpoint
    zk-poc/page.tsx              ← e2e test harness at /zk-poc
```

None of the existing code paths are modified. The current mint flow
(WizperNFT, WizperToken, WizperZKVerifier) still works exactly as before.

## Deployment

### Step 1 — Use the pre-deployed Semaphore on Base Sepolia

Semaphore v4 is already deployed on Base Sepolia. Use these addresses:

- **Semaphore**: `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`
- **SemaphoreVerifier**: `0x4DeC9E3784EcC1eE002001BfE91deEf4A48931f8`

Source: <https://docs.semaphore.pse.dev/deployed-contracts>

You only need the `Semaphore` address for Step 2.

### Step 2 — Deploy WizperAnonymous

1. Open Remix, paste `contracts/WizperAnonymous.sol`.
2. Compile with Solidity 0.8.23 or higher.
3. Deploy with constructor args:
   - `semaphoreAddress`: the Semaphore contract address from Step 1
   - `_soulbound`: `true` (recommended) or `false`
4. After deployment, call `initialize()` ONCE from the owner account.
   - This creates a new group inside Semaphore with WizperAnonymous as admin.
   - A successful call emits `GroupInitialized(groupId)`.
5. Record the WizperAnonymous address.

### Step 3 — Fund the relayer wallet

1. Generate a fresh private key — for example in Node:
   ```js
   const { generatePrivateKey } = require('viem/accounts');
   console.log(generatePrivateKey());
   ```
2. Send ~0.05 Base Sepolia ETH to the matching address. Faucet:
   <https://docs.base.org/docs/tools/network-faucets>.
3. Keep the private key: it goes into `RELAYER_PRIVATE_KEY`.

### Step 4 — Add env vars

Append to `.env.local`:

```env
# Wizper Anonymous POC
NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS=0xYourWizperAnonymousAddress
RELAYER_PRIVATE_KEY=0xRelayerHotWalletKey
```

Restart `pnpm dev` after editing.

### Step 5 — Run the POC page

Go to <http://localhost:3000/zk-poc>. You should see seven sections with
controls. Use them top-to-bottom:

## Testing the flow

1. **Section 2 — Create identity**
   - Click "Create new". A fresh Semaphore identity is generated and stored
     in `localStorage.wizper_semaphore_identity_v1`.
   - Note: the stealth address shown is what will own your NFTs.

2. **Section 3 — Join group**
   - Connect your MetaMask (use an existing UI control in your app header, or
     call `connect` from the AppContext — this POC doesn't include a connect
     button to avoid UI dependencies).
   - Click "Join group". MetaMask will prompt you to sign a tx calling
     `joinGroup(identityCommitment)` on WizperAnonymous.
   - Once confirmed, the group size should increase. The page auto-refreshes
     after the tx confirms.

3. **Section 4 — Anonymous mint**
   - Type some text and pick an emotion.
   - Click "Mint anonymously". You should see in the log:
     - "building local Semaphore group from on-chain members..."
     - "generating proof (this takes 2-6s)..."
     - "proof generated in X.XXs" — expect 2–6 s on a laptop, slower on mobile
     - "sending to relayer..."
     - "mint tx: 0x..."
     - "confirmed in block N"
   - Confirm on BaseScan: <https://sepolia.basescan.org/address/YOUR_CONTRACT>
     should show a `SpiritMinted` event with `stealthOwner` = your stealth
     address (NOT your main wallet).

4. **Section 5 — Verify ownership**
   - After a successful mint, the tokenId should appear here.
   - Open BaseScan, go to the contract → Read → `balanceOf(stealthAddress)`.
     Should return 1 (or however many you minted).
   - Verify `balanceOf(mainWallet)` returns 0 → your main wallet does NOT
     own the NFT. This is the privacy guarantee.

## What to verify (acceptance criteria)

**Functionality:**
- [ ] Identity persists across page reloads
- [ ] `joinGroup` tx succeeds and MemberJoined event is emitted
- [ ] Group-size query reflects your membership
- [ ] Proof generates in < 10 s on your dev machine
- [ ] Relayer successfully submits `mintSpirit` tx
- [ ] NFT appears under the stealth address, not your main wallet
- [ ] Same text cannot be minted twice (try — you should see a
  `Semaphore__YouAreUsingTheSameNullifierTwice` or `AlreadyMinted` revert)

**Anonymity:**
- [ ] On BaseScan, the `SpiritMinted` event's `stealthOwner` is a fresh
  address with no other activity
- [ ] The only on-chain link between your main wallet and Wizper is the
  `joinGroup` tx, which only proves you are SOME member of the group,
  not which spirit is yours
- [ ] `tokenOfOwnerByIndex` for your main wallet returns nothing

**Gas check:**
- [ ] Record the gas used by `mintSpirit`. Expect 500–800k gas on Base Sepolia.
  At Base L2 gas prices (~0.005 gwei), that is ~$0.01–$0.03 per mint.

## Known limitations of Phase 0

These are **intentional** — Phase 1 will address them:

- **No Pinata integration** in the POC mint. Uses a data URI tokenURI so
  there's no dependency on your Pinata config. In production, call
  `/api/upload` first.
- **No sybil protection on joinGroup**. Anyone (any wallet) can call it
  with any commitment. Fine for a private testnet, but needs
  captcha / WorldID / etc. before mainnet.
- **Group root is re-fetched every mint**. For scalability, cache it
  (indexer or local cache with invalidation on MemberJoined).
- **No Link flow yet**. Covered in Phase 2 (group-of-one proofs).
- **No identity backup UX**. Users who clear localStorage lose all their
  spirits permanently. Phase 1 will add an export/mnemonic flow.
- **Main-wallet reveal at joinGroup**. Documented in the B-plan writeup as
  an accepted tradeoff for Phase 1.

## Troubleshooting

**"relayer not configured"** — missing env vars. Check `.env.local` and
restart dev server.

**"Semaphore__MerkleTreeRootIsExpired"** — your local group state drifted
from on-chain. Click "Refresh from chain" in Section 3, then mint again.
Semaphore lets roots expire after a configurable duration.

**"MessageMismatch" / "ScopeMismatch"** — the raw values computed
client-side and server-side diverged. Most likely cause: the contract's
`abi.encode(stealthOwner, uri, expressionHash, emotion)` order must match
`encodeAbiParameters` in `semaphore.ts`. If you change one, change the other.

**Proof generation times out** — Semaphore fetches circuit artifacts from
a CDN on first proof. First call may take 10–20 s. Subsequent calls are
faster (cached). If you're behind a restrictive network, you may need to
pre-download the artifacts and pass them via the `snarkArtifacts` parameter
of `generateProof`.

**Relayer tx reverts with `Semaphore__InvalidProof`** — the proof did not
verify. Common cause: the local `Group` was built with a different member
ordering than on-chain. `buildGroup` iterates the commitments array in the
order you pass it; make sure `syncGroupFromChain` reads events in ascending
block order (viem's `getLogs` does this by default).

## Next steps after POC passes

Phase 1 (full integration):
1. Replace the mint flow in `AppContext.mintExpressionNFT` with the new
   proof-based path.
2. Add the `/api/upload` call back in so tokenURI points at real Pinata IPFS.
3. Add an identity onboarding screen (`/join`) that creates + backs up
   the identity secret and calls `joinGroup`.
4. Replace the `/my` page to read from the stealth address on-chain
   rather than querying the DB by `owner`.
5. Decide whether to keep the DB at all, or reduce it to a read-only
   cache populated from chain events.

Phase 2 (links):
- Extend WizperAnonymous with `requestLink` / `confirmLink` using
  group-of-one membership proofs tied to each token's `identityCommitment`
  stored at mint time.
