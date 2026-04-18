'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useAccount, useConnect, useDisconnect, useConnectors, useWriteContract, usePublicClient } from 'wagmi';
import { keccak256, toBytes, parseAbi, type Hex } from 'viem';
import type { Identity } from '@semaphore-protocol/identity';
import { type Confession, type Link } from '@/data/mock';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { WIZPER_TOKEN_ABI } from '@/lib/contracts/abis';
import { WIZPER_ANONYMOUS_ABI } from '@/lib/contracts/anonymousAbi';

const SEMAPHORE_GROUPS_ABI = parseAbi([
  'function hasMember(uint256 groupId, uint256 identityCommitment) view returns (bool)',
  'function getMerkleTreeSize(uint256 groupId) view returns (uint256)',
]);
import {
  loadIdentity,
  createIdentity as semaphoreCreateIdentity,
  importIdentitySecret,
  exportIdentitySecret,
  clearIdentity as semaphoreClearIdentity,
  buildGroup,
  proveMint,
  saveLocalPost,
} from '@/lib/semaphore';
import { deriveStealthAddress } from '@/lib/stealth';
import { signLinkRequest, signLinkConfirm } from '@/lib/link';

/* ---- Wallet ---- */
interface WalletConnector {
  id: string;
  name: string;
  connect: () => void;
}

interface WalletState {
  connected: boolean;
  address: string | null;
  fullAddress: string | null;
  connectors: WalletConnector[];
  connect: () => void;
  disconnect: () => void;
}

/* ---- Anonymous Identity ---- */
interface IdentityState {
  // Whether the Semaphore identity has been loaded into memory.
  // null during SSR and during the initial client hydration tick.
  identity: Identity | null;
  commitment: string | null;          // decimal string of identity.commitment
  stealthAddress: Hex | null;         // derived Ethereum address for NFT ownership
  isMember: boolean | null;           // null = unknown / loading
  memberCount: number | null;         // current size of the on-chain group
  joining: boolean;                   // true while joinGroup tx is in flight

  // Actions
  createIdentity: () => Identity;
  importIdentity: (secretBase64: string) => Identity;
  exportSecret: () => string | null;
  clearIdentity: () => void;
  joinGroup: () => Promise<Hex>;
  refreshMembership: () => Promise<void>;
}

/* ---- App State ---- */
interface AppState {
  // Feed: minted expressions (public)
  feedExpressions: Confession[];
  // Mine: user's own expressions (minted + un-minted)
  myExpressions: Confession[];
  links: Link[];
  deleteExpression: (id: string) => Promise<void>;
  hideExpression: (id: string, hidden?: boolean) => Promise<void>;
  /** On-chain link: sign with stealth owner of fromTokenId, relayer submits. */
  requestLinkOnchain: (args: { fromTokenId: bigint; toTokenId: bigint }) => Promise<`0x${string}`>;
  confirmLinkOnchain: (args: { fromTokenId: bigint; toTokenId: bigint }) => Promise<`0x${string}`>;
  /** Pull LinkRequested/LinkConfirmed events from chain and fold into `links`. */
  refreshChainLinks: () => Promise<void>;
  /**
   * Pending links where the other side requested a connection TO one of
   * my spirits. The UI shows these as "inbound", inviting me to confirm
   * (or reciprocate with my own request, which the detail page treats as
   * equivalent to confirming).
   */
  inboundRequests: Link[];
  mintSpiritAnonymous: (args: { id: string; text: string; emotion: string; svgElement?: SVGSVGElement | null }) => Promise<{ txHash: Hex; tokenURI: string }>;
  claimDailyReward: () => Promise<void>;
  wallet: WalletState;
  isMinting: boolean;
  refreshFeed: () => Promise<void>;
  refreshMine: () => Promise<void>;
  identity: IdentityState;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [feedExpressions, setFeedExpressions] = useState<Confession[]>([]);
  const [myExpressions, setMyExpressions] = useState<Confession[]>([]);
  const [links, setLinks] = useState<Link[]>([]);
  const [isMinting, setIsMinting] = useState(false);

  /* ── wagmi wallet ── */
  const { address, isConnected } = useAccount();
  const { connect: wagmiConnect } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const availableConnectors = useConnectors();
  const publicClient = usePublicClient();

  /* ── anonymous identity ── */
  const [identityObj, setIdentityObj] = useState<Identity | null>(null);
  const [identityHydrated, setIdentityHydrated] = useState(false);
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [joining, setJoining] = useState(false);

  // Hydrate the identity from localStorage on mount.
  useEffect(() => {
    setIdentityObj(loadIdentity());
    setIdentityHydrated(true);
  }, []);

  const walletConnectors: WalletConnector[] = availableConnectors.map(c => ({
    id: c.id,
    name: c.name,
    connect: () => wagmiConnect({ connector: c }),
  }));

  const connect = useCallback(() => {
    const first = availableConnectors[0];
    if (first) wagmiConnect({ connector: first });
  }, [wagmiConnect, availableConnectors]);

  const disconnect = useCallback(() => {
    wagmiDisconnect();
  }, [wagmiDisconnect]);

  /* ── Data fetching ── */
  const refreshFeed = useCallback(async () => {
    try {
      const res = await fetch('/api/expressions');
      if (res.ok) {
        const data = await res.json();
        setFeedExpressions(data.map(dbToConfession));
      }
    } catch { /* ignore */ }
  }, []);

  // `/my` now shows spirits owned by the stealth address (anonymous flow),
  // falling back to the main-wallet owner for any legacy records created
  // before Phase 1. The stealth is preferred because the new flow writes
  // `owner = stealthAddress` to the DB.
  const refreshMine = useCallback(async () => {
    const stealth = identityObj ? deriveStealthAddress(identityObj) : null;
    const owners: string[] = [stealth, address].filter((v): v is NonNullable<typeof v> => !!v);
    if (owners.length === 0) {
      setMyExpressions([]);
      return;
    }
    try {
      const results = await Promise.all(
        owners.map(owner =>
          fetch(`/api/expressions/mine?owner=${owner}`).then(r => (r.ok ? r.json() : [])),
        ),
      );
      const seen = new Set<string>();
      const merged: Record<string, unknown>[] = [];
      for (const arr of results) {
        for (const row of arr) {
          if (seen.has(row.id)) continue;
          seen.add(row.id);
          merged.push(row);
        }
      }
      setMyExpressions(merged.map(dbToConfession));
    } catch { /* ignore */ }
  }, [address, identityObj]);

  // Load feed on mount
  useEffect(() => { refreshFeed(); }, [refreshFeed]);

  // Load mine when wallet changes
  useEffect(() => { refreshMine(); }, [refreshMine]);

  // Links are populated via refreshChainLinks (on-chain events). The legacy
  // /api/links DB is no longer the source of truth in the anonymous flow.

  /* ── contract writes ── */
  const { writeContractAsync } = useWriteContract();

  /* ── Actions ── */

  // Delete a draft expression.
  // Supports both ownership models:
  //   - legacy: owner = main wallet (old mintExpressionNFT path)
  //   - anonymous: owner = stealth address (new mintSpiritAnonymous path,
  //                which doesn't actually create drafts, but we keep this
  //                generic so legacy records can still be cleaned up)
  const deleteExpression = useCallback(async (id: string) => {
    const stealth = identityObj ? deriveStealthAddress(identityObj) : null;
    const owner = stealth ?? address;
    if (!owner) return;

    const res = await fetch('/api/expressions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, owner }),
    });

    if (res.ok) {
      setMyExpressions(prev => prev.filter(c => c.id !== id));
    }
  }, [address, identityObj]);

  // Hide/unhide a minted expression from the public feed. The DB API
  // verifies ownership against the `owner` field — we send the stealth
  // address if we have one, falling back to the main wallet for legacy
  // records. Defaults to hide (true).
  const hideExpression = useCallback(async (id: string, hidden: boolean = true) => {
    const stealth = identityObj ? deriveStealthAddress(identityObj) : null;
    const owner = stealth ?? address;
    const res = await fetch('/api/expressions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hidden, owner }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      throw new Error((body && body.error) || `hide failed: ${res.status}`);
    }

    // Reflect in local state: update `hidden` flag on my list, remove from
    // public feed (or re-add if unhide — simpler to just refetch feed).
    setMyExpressions(prev => prev.map(c => c.id === id ? { ...c, hidden } : c));
    if (hidden) {
      setFeedExpressions(prev => prev.filter(c => c.id !== id));
    } else {
      // unhide: let the next feed refetch pick it up (re-inserting client-side
      // would also need the full record; simpler to refresh)
      await refreshFeed();
    }
  }, [address, identityObj, refreshFeed]);

  // Claim daily reward
  const claimDailyReward = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.wizperToken as `0x${string}`,
      abi: parseAbi(WIZPER_TOKEN_ABI as unknown as string[]),
      functionName: 'claimDailyReward',
      gas: BigInt(200_000),
    });
  }, [address, writeContractAsync]);

  const walletAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  /* ── Identity actions ── */
  const ANON_ADDRESS = process.env.NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS as Hex | undefined;
  const ANON_ABI_PARSED = parseAbi(WIZPER_ANONYMOUS_ABI as unknown as string[]);
  const ANON_DEPLOY_BLOCK = process.env.NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK
    ? BigInt(process.env.NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK)
    : null;

  const refreshMembership = useCallback(async () => {
    if (!ANON_ADDRESS || !publicClient || !identityObj) {
      setIsMember(null);
      setMemberCount(null);
      return;
    }
    try {
      // Query Semaphore directly: hasMember / getMerkleTreeSize on the
      // Semaphore contract. This avoids scanning MemberJoined events, which
      // is both slow and bounded by RPC block-range limits (and would miss
      // joins older than the scan window if NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK
      // is unset).
      const [semaphoreAddr, gid] = await Promise.all([
        publicClient.readContract({
          address: ANON_ADDRESS,
          abi: ANON_ABI_PARSED,
          functionName: 'semaphore',
        }) as Promise<Hex>,
        publicClient.readContract({
          address: ANON_ADDRESS,
          abi: ANON_ABI_PARSED,
          functionName: 'groupId',
        }) as Promise<bigint>,
      ]);

      const [member, size] = await Promise.all([
        publicClient.readContract({
          address: semaphoreAddr,
          abi: SEMAPHORE_GROUPS_ABI,
          functionName: 'hasMember',
          args: [gid, identityObj.commitment],
        }) as Promise<boolean>,
        publicClient.readContract({
          address: semaphoreAddr,
          abi: SEMAPHORE_GROUPS_ABI,
          functionName: 'getMerkleTreeSize',
          args: [gid],
        }) as Promise<bigint>,
      ]);

      setIsMember(member);
      setMemberCount(Number(size));
    } catch (err) {
      console.error('[identity] refreshMembership failed:', err);
    }
  }, [publicClient, identityObj, ANON_ADDRESS, ANON_ABI_PARSED]);

  // Auto-refresh membership when identity becomes available or contract loaded.
  useEffect(() => {
    if (identityHydrated && identityObj && publicClient) {
      refreshMembership();
    }
  }, [identityHydrated, identityObj, publicClient, refreshMembership]);

  const createIdentityFn = useCallback((): Identity => {
    const id = semaphoreCreateIdentity();
    setIdentityObj(id);
    setIsMember(false);
    return id;
  }, []);

  const importIdentityFn = useCallback((secret: string): Identity => {
    const id = importIdentitySecret(secret.trim());
    setIdentityObj(id);
    setIsMember(null);
    return id;
  }, []);

  const exportSecretFn = useCallback((): string | null => exportIdentitySecret(), []);

  const clearIdentityFn = useCallback(() => {
    semaphoreClearIdentity();
    setIdentityObj(null);
    setIsMember(null);
    setMemberCount(null);
  }, []);

  const joinGroupFn = useCallback(async (): Promise<Hex> => {
    if (!identityObj) throw new Error('No identity — create one first');
    if (!ANON_ADDRESS) throw new Error('Anonymous contract address not configured');
    if (!isConnected) throw new Error('Connect your wallet first');
    // Guard: if this commitment is already a member, sending joinGroup again
    // reverts inside Semaphore with LeafAlreadyExists. Gas estimation then
    // surfaces as "exceeds max transaction gas limit". Refresh status and
    // short-circuit with a clear message instead.
    if (publicClient) {
      try {
        const [semaphoreAddr, gid] = await Promise.all([
          publicClient.readContract({
            address: ANON_ADDRESS,
            abi: ANON_ABI_PARSED,
            functionName: 'semaphore',
          }) as Promise<Hex>,
          publicClient.readContract({
            address: ANON_ADDRESS,
            abi: ANON_ABI_PARSED,
            functionName: 'groupId',
          }) as Promise<bigint>,
        ]);
        const already = (await publicClient.readContract({
          address: semaphoreAddr,
          abi: SEMAPHORE_GROUPS_ABI,
          functionName: 'hasMember',
          args: [gid, identityObj.commitment],
        })) as boolean;
        if (already) {
          setIsMember(true);
          throw new Error('This identity has already joined the group.');
        }
      } catch (err) {
        if (err instanceof Error && err.message.includes('already joined')) throw err;
        // Ignore pre-flight read failures — fall through to the write.
      }
    }
    setJoining(true);
    try {
      const hash = await writeContractAsync({
        address: ANON_ADDRESS,
        abi: ANON_ABI_PARSED,
        functionName: 'joinGroup',
        args: [identityObj.commitment],
      });
      if (publicClient) {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== 'success') {
          throw new Error(`joinGroup tx reverted: ${hash}`);
        }
      }
      await refreshMembership();
      return hash;
    } finally {
      setJoining(false);
    }
  }, [identityObj, isConnected, publicClient, refreshMembership, ANON_ADDRESS, ANON_ABI_PARSED]);

  // ── Pull on-chain link events into the `links` array ──
  //
  // The UI (/connections, /confession/[id]) reads `links[]`. On the legacy
  // path they came from the /api/links DB. In the new flow links live
  // on-chain as LinkRequested / LinkConfirmed events; we scan them and
  // translate tokenId ↔ expressionId via the current expression list.
  const refreshChainLinks = useCallback(async () => {
    if (!ANON_ADDRESS || !publicClient) return;

    const tokenToId = new Map<string, string>();
    for (const c of [...feedExpressions, ...myExpressions]) {
      if (c.tokenId) tokenToId.set(c.tokenId, c.id);
    }
    if (tokenToId.size === 0) return;

    try {
      const latest = await publicClient.getBlockNumber();
      const startBlock =
        ANON_DEPLOY_BLOCK ?? (latest > BigInt(50_000) ? latest - BigInt(50_000) : BigInt(0));
      const CHUNK = BigInt(9_500);

      const requested: Array<{ fromTokenId: bigint; toTokenId: bigint; linkId: `0x${string}` }> = [];
      const confirmed: Set<string> = new Set();

      let cursor = startBlock;
      while (cursor <= latest) {
        const to = cursor + CHUNK > latest ? latest : cursor + CHUNK;

        const reqLogs = await publicClient.getLogs({
          address: ANON_ADDRESS,
          event: {
            type: 'event',
            name: 'LinkRequested',
            inputs: [
              { type: 'bytes32', name: 'linkId', indexed: true },
              { type: 'uint256', name: 'fromTokenId', indexed: true },
              { type: 'uint256', name: 'toTokenId', indexed: true },
            ],
          },
          fromBlock: cursor,
          toBlock: to,
        });
        for (const l of reqLogs) {
          const a = l.args as { linkId?: `0x${string}`; fromTokenId?: bigint; toTokenId?: bigint };
          if (a.linkId && typeof a.fromTokenId === 'bigint' && typeof a.toTokenId === 'bigint') {
            requested.push({ linkId: a.linkId, fromTokenId: a.fromTokenId, toTokenId: a.toTokenId });
          }
        }

        const confLogs = await publicClient.getLogs({
          address: ANON_ADDRESS,
          event: {
            type: 'event',
            name: 'LinkConfirmed',
            inputs: [
              { type: 'bytes32', name: 'linkId', indexed: true },
              { type: 'uint256', name: 'fromTokenId', indexed: true },
              { type: 'uint256', name: 'toTokenId', indexed: true },
            ],
          },
          fromBlock: cursor,
          toBlock: to,
        });
        for (const l of confLogs) {
          const a = l.args as { linkId?: `0x${string}` };
          if (a.linkId) confirmed.add(a.linkId);
        }

        cursor = to + BigInt(1);
      }

      const chainLinks: Link[] = [];
      for (const r of requested) {
        const fromExpId = tokenToId.get(r.fromTokenId.toString());
        const toExpId = tokenToId.get(r.toTokenId.toString());
        if (!fromExpId || !toExpId) continue;
        chainLinks.push({
          id: r.linkId,
          fromId: fromExpId,
          toId: toExpId,
          status: confirmed.has(r.linkId) ? 'confirmed' : 'pending',
        });
      }

      setLinks(chainLinks);
    } catch (err) {
      console.error('[refreshChainLinks] failed:', err);
    }
  }, [publicClient, feedExpressions, myExpressions, ANON_ADDRESS, ANON_DEPLOY_BLOCK]);

  // Auto-refresh chain links whenever the expression list changes.
  useEffect(() => {
    if (feedExpressions.length + myExpressions.length > 0) {
      refreshChainLinks();
    }
  }, [feedExpressions, myExpressions, refreshChainLinks]);

  // ── On-chain link (new flow) ──
  //
  // The stealth owner of fromTokenId signs a LinkRequest; the stealth owner
  // of toTokenId signs a LinkConfirm. Signatures are sent through the same
  // relayer that powers mint — the relayer cannot forge them because the
  // contract checks `ecrecover(sig) == ownerOf(tokenId)`.
  const requestLinkOnchain = useCallback(
    async ({ fromTokenId, toTokenId }: { fromTokenId: bigint; toTokenId: bigint }) => {
      if (!identityObj) throw new Error('No identity — set up at /join');
      if (!ANON_ADDRESS) throw new Error('Anonymous contract address not configured');
      if (!publicClient) throw new Error('Public client not ready');

      const chainId = await publicClient.getChainId();
      const signature = await signLinkRequest({
        identity: identityObj,
        chainId,
        contractAddress: ANON_ADDRESS,
        fromTokenId,
        toTokenId,
      });

      const res = await fetch('/api/relay/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'request',
          fromTokenId: fromTokenId.toString(),
          toTokenId: toTokenId.toString(),
          signature,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'relay failed');
      const hash = body.hash as Hex;

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`linkRequest reverted: ${hash}`);
      // Surface the new link in the global `links` state so other pages see it.
      await refreshChainLinks();
      return hash;
    },
    [identityObj, publicClient, ANON_ADDRESS, refreshChainLinks],
  );

  const confirmLinkOnchain = useCallback(
    async ({ fromTokenId, toTokenId }: { fromTokenId: bigint; toTokenId: bigint }) => {
      if (!identityObj) throw new Error('No identity — set up at /join');
      if (!ANON_ADDRESS) throw new Error('Anonymous contract address not configured');
      if (!publicClient) throw new Error('Public client not ready');

      const chainId = await publicClient.getChainId();
      const signature = await signLinkConfirm({
        identity: identityObj,
        chainId,
        contractAddress: ANON_ADDRESS,
        fromTokenId,
        toTokenId,
      });

      const res = await fetch('/api/relay/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'confirm',
          fromTokenId: fromTokenId.toString(),
          toTokenId: toTokenId.toString(),
          signature,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'relay failed');
      const hash = body.hash as Hex;

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== 'success') throw new Error(`linkConfirm reverted: ${hash}`);
      await refreshChainLinks();
      return hash;
    },
    [identityObj, publicClient, ANON_ADDRESS, refreshChainLinks],
  );

  // ── Anonymous mint (Phase 1 ZK flow) ──
  //
  // Preconditions: Semaphore identity loaded + currently an on-chain group member.
  // Main wallet is NOT used here. The mint is relayed; the NFT owner is the
  // stealth address derived from the identity secret.
  const mintSpiritAnonymous = useCallback(
    async ({ id, text, emotion, svgElement }: {
      id: string;
      text: string;
      emotion: string;
      svgElement?: SVGSVGElement | null;
    }): Promise<{ txHash: Hex; tokenURI: string }> => {
      if (!identityObj) throw new Error('No identity — join Wizper first at /join');
      if (!publicClient) throw new Error('Public client not ready');
      if (!ANON_ADDRESS) throw new Error('Anonymous contract address not configured');
      const stealth = deriveStealthAddress(identityObj);

      setIsMinting(true);
      try {
        // 1. Fresh scan of MemberJoined events so we build the exact Merkle
        //    tree the contract currently stores.
        const latest = await publicClient.getBlockNumber();
        const startBlock =
          ANON_DEPLOY_BLOCK ?? (latest > BigInt(50_000) ? latest - BigInt(50_000) : BigInt(0));
        const CHUNK = BigInt(9_500);
        const commitments: bigint[] = [];
        let cursor = startBlock;
        while (cursor <= latest) {
          const to = cursor + CHUNK > latest ? latest : cursor + CHUNK;
          const logs = await publicClient.getLogs({
            address: ANON_ADDRESS,
            event: {
              type: 'event',
              name: 'MemberJoined',
              inputs: [{ type: 'uint256', name: 'identityCommitment' }],
            },
            fromBlock: cursor,
            toBlock: to,
          });
          for (const l of logs) {
            const c = (l.args as { identityCommitment?: bigint }).identityCommitment;
            if (typeof c === 'bigint') commitments.push(c);
          }
          cursor = to + BigInt(1);
        }
        if (!commitments.includes(identityObj.commitment)) {
          throw new Error('Your identity is not yet a member of the Wizper group. Go to /join.');
        }

        // 2. Upload text + SVG + metadata to IPFS (text lives here, not DB).
        const svgString = svgElement
          ? new XMLSerializer().serializeToString(svgElement)
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><text y="40" font-size="8">${emotion}</text></svg>`;
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ svg: svgString, text, emotion, wizardId: id }),
        });
        if (!uploadRes.ok) throw new Error('IPFS upload failed');
        const { tokenURI } = (await uploadRes.json()) as { tokenURI: string };

        // 3. Generate Semaphore proof binding stealth address + tokenURI + text hash.
        const expressionHash = keccak256(toBytes(text));
        const group = buildGroup(commitments);
        const { proof } = await proveMint({
          identity: identityObj,
          group,
          stealthAddress: stealth,
          tokenURI,
          expressionHash,
          emotion,
        });

        // 4. Submit to relayer.
        const relayRes = await fetch('/api/relay/mint', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proof: {
              merkleTreeDepth: proof.merkleTreeDepth.toString(),
              merkleTreeRoot: proof.merkleTreeRoot.toString(),
              nullifier: proof.nullifier.toString(),
              message: proof.message.toString(),
              scope: proof.scope.toString(),
              points: proof.points.map(p => p.toString()),
            },
            stealthOwner: stealth,
            tokenURI,
            expressionHash,
            emotion,
          }),
        });
        const relayBody = await relayRes.json();
        if (!relayRes.ok) throw new Error(relayBody.error || 'Relay failed');
        const txHash = relayBody.hash as Hex;

        // 5. Wait for confirmation, then persist to DB cache.
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== 'success') throw new Error(`Mint tx reverted: ${txHash}`);

        // Extract tokenId from the SpiritMinted event.
        // keccak256("SpiritMinted(uint256,address,bytes32,string)")
        const SPIRIT_MINTED_TOPIC =
          '0xc99d7c87f23335ba6f81e7948c72dd805818b3cf8b7d0c814149cd39dc1d0036';
        let tokenId: string | undefined;
        for (const log of receipt.logs) {
          if (
            log.address.toLowerCase() === ANON_ADDRESS.toLowerCase() &&
            log.topics[0]?.toLowerCase() === SPIRIT_MINTED_TOPIC &&
            log.topics[1]
          ) {
            // First indexed topic after the signature is tokenId.
            try {
              tokenId = BigInt(log.topics[1]).toString();
              break;
            } catch { /* ignore malformed */ }
          }
        }

        await fetch('/api/expressions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            text,
            emotion,
            owner: stealth,
            minted: true,
            tokenId,
            tokenURI,
            txHash,
          }),
        });

        // 6. Local log — used by /my for instant display without refetching.
        saveLocalPost({
          expressionId: id,
          expressionHash,
          stealthAddress: stealth,
          tokenURI,
          emotion,
          createdAt: new Date().toISOString(),
          txHash,
        });

        // 7. Refresh feed.
        await refreshFeed();
        return { txHash, tokenURI };
      } finally {
        setIsMinting(false);
      }
    },
    [identityObj, publicClient, refreshFeed, ANON_ADDRESS, ANON_DEPLOY_BLOCK],
  );

  const stealthAddress = identityObj ? deriveStealthAddress(identityObj) : null;
  const identityCommitment = identityObj ? identityObj.commitment.toString() : null;

  // Inbound: a pending link whose destination (toId) is one of my spirits.
  // I can open that spirit's detail page and accept. This includes the
  // self-test case (both sides mine) since dev / same-identity testing
  // should also surface the notification.
  const inboundRequests: Link[] = (() => {
    const myIds = new Set(myExpressions.map(c => c.id));
    const result: Link[] = [];
    for (const l of links) {
      if (l.status !== 'pending') continue;
      if (!myIds.has(l.toId)) continue;
      result.push(l);
    }
    return result;
  })();

  return (
    <AppContext.Provider
      value={{
        feedExpressions,
        myExpressions,
        links,
        deleteExpression,
        hideExpression,
        requestLinkOnchain,
        confirmLinkOnchain,
        refreshChainLinks,
        inboundRequests,
        mintSpiritAnonymous,
        claimDailyReward,
        wallet: {
          connected: isConnected,
          address: walletAddress,
          fullAddress: address ?? null,
          connectors: walletConnectors,
          connect,
          disconnect,
        },
        isMinting,
        refreshFeed,
        refreshMine,
        identity: {
          identity: identityObj,
          commitment: identityCommitment,
          stealthAddress,
          isMember,
          memberCount,
          joining,
          createIdentity: createIdentityFn,
          importIdentity: importIdentityFn,
          exportSecret: exportSecretFn,
          clearIdentity: clearIdentityFn,
          joinGroup: joinGroupFn,
          refreshMembership,
        },
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/* ── Helper: convert DB record to Confession type ── */
function dbToConfession(row: Record<string, unknown>): Confession {
  const links = (row.links as Array<Record<string, string>> | undefined) ?? [];
  const linkedBy = (row.linkedBy as Array<Record<string, string>> | undefined) ?? [];
  const confirmed = [...links, ...linkedBy].filter(l => l.status === 'confirmed');
  const pending = [...links, ...linkedBy].filter(l => l.status === 'pending');

  return {
    id: row.id as string,
    text: row.text as string,
    emotion: row.emotion as Confession['emotion'],
    minted: row.minted as boolean,
    hidden: (row.hidden as boolean | undefined) ?? false,
    tokenId: (row.tokenId as string | undefined) ?? undefined,
    createdAt: row.createdAt as string,
    linkedIds: confirmed.map(l => l.toId || l.fromId),
    pendingLinkIds: pending.map(l => l.toId || l.fromId),
  };
}
