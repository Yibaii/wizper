'use client';

/**
 * /zk-poc — end-to-end test harness for the anonymous mint flow.
 *
 * This page is deliberately minimal. It exists to verify Phase 0 works:
 *   1. Identity generation + stealth address derivation
 *   2. Joining the Semaphore group on-chain (main wallet tx)
 *   3. Fetching on-chain group members into a local Group
 *   4. Generating a Semaphore proof
 *   5. Hitting /api/relay/mint so the relayer submits the mint
 *   6. Showing the resulting tx hash and stealth-owned tokenId
 *
 * There is no styling, no copy polish, no prod-grade error UX —
 * swap in proper screens once the plumbing is verified.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { keccak256, parseAbi, toBytes, type Hex } from 'viem';
import {
  createIdentity,
  loadIdentity,
  exportIdentitySecret,
  importIdentitySecret,
  clearIdentity,
  buildGroup,
  proveMint,
  saveLocalPost,
  getLocalPosts,
  type LocalPost,
} from '@/lib/semaphore';
import { deriveStealthAddress } from '@/lib/stealth';
import { WIZPER_ANONYMOUS_ABI } from '@/lib/contracts/anonymousAbi';
import { signLinkRequest, signLinkConfirm, linkId as computeLinkId } from '@/lib/link';
import type { Identity } from '@semaphore-protocol/identity';

const CONTRACT = process.env.NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS as Hex | undefined;
const DEPLOY_BLOCK_ENV = process.env.NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK;
const DEPLOY_BLOCK: bigint | null = DEPLOY_BLOCK_ENV ? BigInt(DEPLOY_BLOCK_ENV) : null;
const ABI = parseAbi(WIZPER_ANONYMOUS_ABI as unknown as string[]);

// Base Sepolia public RPC caps eth_getLogs at 10k block range. Chunk under it.
const GETLOGS_CHUNK = BigInt(9_500);
// Fallback scan window when NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK isn't set.
const DEFAULT_LOOKBACK = BigInt(50_000);

type LogLine = { t: number; kind: 'info' | 'ok' | 'err'; msg: string };

export default function ZkPocPage() {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [commitments, setCommitments] = useState<bigint[]>([]);
  const [text, setText] = useState('I feel alone at 3am again.');
  const [emotion, setEmotion] = useState('sadness');
  const [log, setLog] = useState<LogLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [mintedTokenIds, setMintedTokenIds] = useState<string[]>([]);
  const [posts, setPosts] = useState<LocalPost[]>([]);
  const [linkFromId, setLinkFromId] = useState('');
  const [linkToId, setLinkToId] = useState('');

  const { address: mainWallet, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  const stealthAddress = useMemo(
    () => (identity ? deriveStealthAddress(identity) : null),
    [identity],
  );

  function push(kind: LogLine['kind'], msg: string) {
    setLog(l => [...l, { t: Date.now(), kind, msg }]);
    // eslint-disable-next-line no-console
    console.log(`[zk-poc:${kind}]`, msg);
  }

  // Avoid hydration mismatch: the wallet address and identity are only
  // available on the client, so we defer showing wallet-dependent UI until
  // after mount.
  const [hasMounted, setHasMounted] = useState(false);

  // Hydrate identity + local posts on mount
  useEffect(() => {
    setHasMounted(true);
    setIdentity(loadIdentity());
    setPosts(getLocalPosts());
  }, []);

  // Fetch on-chain group members whenever identity/contract is available.
  async function syncGroupFromChain() {
    if (!CONTRACT || !publicClient) {
      push('err', 'contract address or client missing');
      return;
    }
    push('info', 'fetching MemberJoined events...');

    const latest = await publicClient.getBlockNumber();
    const startBlock =
      DEPLOY_BLOCK ?? (latest > DEFAULT_LOOKBACK ? latest - DEFAULT_LOOKBACK : BigInt(0));

    const collected: bigint[] = [];
    let cursor = startBlock;
    while (cursor <= latest) {
      const to = cursor + GETLOGS_CHUNK > latest ? latest : cursor + GETLOGS_CHUNK;
      try {
        const logs = await publicClient.getLogs({
          address: CONTRACT,
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
          if (typeof c === 'bigint') collected.push(c);
        }
      } catch (e) {
        push('err', `getLogs [${cursor}, ${to}]: ${(e as Error).message}`);
      }
      cursor = to + BigInt(1);
    }

    setCommitments(collected);
    push('ok', `group size: ${collected.length} (scanned from block ${startBlock})`);
  }

  // Fetch NFTs currently owned by the stealth address.
  async function refreshMyTokens() {
    if (!CONTRACT || !publicClient || !stealthAddress) return;
    const balance = (await publicClient.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: 'balanceOf',
      args: [stealthAddress],
    })) as bigint;
    const ids: string[] = [];
    const bal = Number(balance);
    for (let i = 0; i < bal; i++) {
      const id = (await publicClient.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'tokenOfOwnerByIndex',
        args: [stealthAddress, BigInt(i)],
      })) as bigint;
      ids.push(id.toString());
    }
    setMintedTokenIds(ids);
  }

  useEffect(() => {
    if (identity && CONTRACT && publicClient) {
      syncGroupFromChain().catch(e => push('err', String(e)));
      refreshMyTokens().catch(e => push('err', String(e)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, publicClient]);

  // ─── Actions ───────────────────────────────────────────────

  function handleCreate() {
    const id = createIdentity();
    setIdentity(id);
    push('ok', `identity created. commitment = ${id.commitment.toString().slice(0, 24)}...`);
  }

  function handleClear() {
    clearIdentity();
    setIdentity(null);
    push('info', 'identity cleared from localStorage');
  }

  function handleExport() {
    const s = exportIdentitySecret();
    if (!s) return;
    navigator.clipboard.writeText(s).catch(() => {});
    push('ok', 'identity secret copied to clipboard');
  }

  function handleImport() {
    const s = prompt('paste identity secret (base64):');
    if (!s) return;
    try {
      const id = importIdentitySecret(s.trim());
      setIdentity(id);
      push('ok', 'identity imported');
    } catch (e) {
      push('err', `import failed: ${e}`);
    }
  }

  async function handleJoin() {
    if (!identity || !CONTRACT || !isConnected) {
      push('err', 'need identity + connected wallet + contract address');
      return;
    }
    setBusy(true);
    try {
      push('info', `joining group with commitment ${identity.commitment.toString().slice(0, 24)}...`);
      const hash = await writeContractAsync({
        address: CONTRACT,
        abi: ABI,
        functionName: 'joinGroup',
        args: [identity.commitment],
      });
      push('ok', `joinGroup tx: ${hash}`);
      // wait then refresh
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      if (receipt && receipt.status !== 'success') {
        push('err', `joinGroup tx REVERTED on-chain — see https://sepolia.basescan.org/tx/${hash}`);
      }
      await syncGroupFromChain();
    } catch (e) {
      push('err', `joinGroup failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleLink(kind: 'request' | 'confirm') {
    if (!identity || !CONTRACT || !publicClient) {
      push('err', 'missing identity / contract / client');
      return;
    }
    if (!linkFromId || !linkToId) {
      push('err', 'fill both from and to token ids');
      return;
    }
    setBusy(true);
    try {
      const fromTokenId = BigInt(linkFromId);
      const toTokenId = BigInt(linkToId);

      // Quick sanity: current identity must own the signing side.
      const expectedOwner = deriveStealthAddress(identity).toLowerCase();
      const ownerSide = kind === 'request' ? fromTokenId : toTokenId;
      const onChainOwner = ((await publicClient.readContract({
        address: CONTRACT,
        abi: ABI,
        functionName: 'ownerOf',
        args: [ownerSide],
      })) as Hex).toLowerCase();
      if (expectedOwner !== onChainOwner) {
        push(
          'err',
          `your stealth address (${expectedOwner}) does not own tokenId ${ownerSide.toString()} — on-chain owner is ${onChainOwner}. Switch identity or pick a different token.`,
        );
        return;
      }

      const chainId = await publicClient.getChainId();
      const ctx = {
        identity,
        chainId,
        contractAddress: CONTRACT,
        fromTokenId,
        toTokenId,
      };
      const sig = kind === 'request' ? await signLinkRequest(ctx) : await signLinkConfirm(ctx);
      push('info', `${kind} signature ready, relaying...`);

      const res = await fetch('/api/relay/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          fromTokenId: fromTokenId.toString(),
          toTokenId: toTokenId.toString(),
          signature: sig,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'relay failed');

      push('ok', `link ${kind} tx: ${body.hash}`);
      const receipt = await publicClient.waitForTransactionReceipt({ hash: body.hash as Hex });
      push('ok', `confirmed in block ${receipt.blockNumber}`);

      const id = computeLinkId(fromTokenId, toTokenId);
      push('info', `linkId = ${id}`);
    } catch (e) {
      push('err', `link ${kind} failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleMint() {
    if (!identity || !stealthAddress || !CONTRACT) {
      push('err', 'missing identity or contract');
      return;
    }
    if (commitments.length === 0) {
      push('err', 'group is empty — join first');
      return;
    }
    if (!commitments.includes(identity.commitment)) {
      push('err', 'your identity is NOT in the on-chain group — join first');
      return;
    }

    setBusy(true);
    try {
      // Step A: build IPFS tokenURI. For POC, use a throwaway data URI so
      // we don't need Pinata to be configured. Production swaps in /api/upload.
      const expressionHash = keccak256(toBytes(text));
      const tokenURI =
        'data:application/json;base64,' +
        Buffer.from(
          JSON.stringify({
            name: 'Wizper POC Wizard',
            description: `emotion: ${emotion}`,
            image: '',
            attributes: [{ trait_type: 'emotion', value: emotion }],
          }),
        ).toString('base64');

      push('info', 'building local Semaphore group from on-chain members...');
      const group = buildGroup(commitments);

      push('info', `generating proof (this takes 2-6s)...`);
      const started = performance.now();
      const { proof } = await proveMint({
        identity,
        group,
        stealthAddress,
        tokenURI,
        expressionHash,
        emotion,
      });
      push('ok', `proof generated in ${((performance.now() - started) / 1000).toFixed(2)}s`);

      push('info', 'sending to relayer...');
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
          stealthOwner: stealthAddress,
          tokenURI,
          expressionHash,
          emotion,
        }),
      });

      const body = await relayRes.json();
      if (!relayRes.ok) throw new Error(body.error || 'relay failed');

      push('ok', `mint tx: ${body.hash}`);
      const receipt = await publicClient?.waitForTransactionReceipt({ hash: body.hash as Hex });
      push('ok', `confirmed in block ${receipt?.blockNumber}`);

      saveLocalPost({
        expressionId: `poc-${Date.now()}`,
        expressionHash,
        stealthAddress,
        tokenURI,
        emotion,
        createdAt: new Date().toISOString(),
        txHash: body.hash,
      });
      setPosts(getLocalPosts());
      await refreshMyTokens();
    } catch (e) {
      push('err', `mint failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────

  const box: React.CSSProperties = {
    border: '1px solid #444',
    padding: 12,
    marginBottom: 12,
    borderRadius: 6,
    background: '#111',
  };

  return (
    <main style={{ fontFamily: 'monospace', color: '#ddd', background: '#000', minHeight: '100vh', padding: 24 }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>
        Wizper ZK Anonymous Mint — POC
      </h1>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>1. Config</h2>
        <div>Contract: <code>{CONTRACT ?? '(set NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS)'}</code></div>
        <div>Main wallet: <code>{hasMounted ? (mainWallet ?? 'not connected') : '…'}</code></div>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>2. Semaphore identity (localStorage)</h2>
        {identity ? (
          <>
            <div>commitment: <code>{identity.commitment.toString()}</code></div>
            <div>stealth addr: <code>{stealthAddress}</code></div>
            <div style={{ marginTop: 8 }}>
              <button onClick={handleExport}>Copy secret</button>{' '}
              <button onClick={handleClear}>Clear</button>
            </div>
          </>
        ) : (
          <>
            <div style={{ marginBottom: 8 }}>no identity stored</div>
            <button onClick={handleCreate}>Create new</button>{' '}
            <button onClick={handleImport}>Import from secret</button>
          </>
        )}
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>3. Group membership</h2>
        <div>on-chain size: {commitments.length}</div>
        <div>you are a member: {identity && commitments.includes(identity.commitment) ? '✓' : '✗'}</div>
        <div style={{ marginTop: 8 }}>
          <button onClick={syncGroupFromChain} disabled={busy}>Refresh from chain</button>{' '}
          <button onClick={handleJoin} disabled={!identity || !isConnected || busy}>
            Join group (main wallet signs)
          </button>
        </div>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>4. Anonymous mint</h2>
        <div style={{ marginBottom: 8 }}>
          <label>Text: </label>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            style={{ width: '80%', background: '#222', color: '#ddd', border: '1px solid #555', padding: 4 }}
          />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>Emotion: </label>
          <select value={emotion} onChange={e => setEmotion(e.target.value)}>
            {['anger', 'sadness', 'joy', 'fear', 'confusion'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <button onClick={handleMint} disabled={busy || !identity}>
          {busy ? 'Working…' : 'Mint anonymously'}
        </button>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>5. Your wizards (owned by stealth address)</h2>
        {mintedTokenIds.length === 0
          ? <div>none yet</div>
          : <ul>{mintedTokenIds.map(id => <li key={id}>tokenId {id}</li>)}</ul>
        }
        <button onClick={refreshMyTokens}>Refresh</button>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>6. Link two wizards</h2>
        <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
          Only the stealth owner of the signing side can sign. To test the full
          handshake with one browser, mint two wizards under the same identity
          and run request then confirm. For real two-user testing, use two
          browsers (different identities) — one signs request on its token, the
          other signs confirm on its token.
        </div>
        <div style={{ marginBottom: 8 }}>
          <label>from tokenId: </label>
          <input
            value={linkFromId}
            onChange={e => setLinkFromId(e.target.value)}
            style={{ width: 120, background: '#222', color: '#ddd', border: '1px solid #555', padding: 4 }}
          />
          {' '}
          <label>to tokenId: </label>
          <input
            value={linkToId}
            onChange={e => setLinkToId(e.target.value)}
            style={{ width: 120, background: '#222', color: '#ddd', border: '1px solid #555', padding: 4 }}
          />
        </div>
        <button onClick={() => handleLink('request')} disabled={busy || !identity}>
          1. Request (sign with from-owner)
        </button>{' '}
        <button onClick={() => handleLink('confirm')} disabled={busy || !identity}>
          2. Confirm (sign with to-owner)
        </button>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>7. Log</h2>
        <div style={{ maxHeight: 240, overflow: 'auto', fontSize: 12 }}>
          {log.map((l, i) => (
            <div key={i} style={{ color: l.kind === 'ok' ? '#9f9' : l.kind === 'err' ? '#f88' : '#aaa' }}>
              [{new Date(l.t).toISOString().slice(11, 19)}] {l.msg}
            </div>
          ))}
        </div>
      </section>

      <section style={box}>
        <h2 style={{ fontSize: 14 }}>8. Local post log</h2>
        <div style={{ maxHeight: 160, overflow: 'auto', fontSize: 12 }}>
          {posts.map(p => (
            <div key={p.expressionId}>
              {p.createdAt.slice(0, 19)} {p.emotion} {p.txHash?.slice(0, 10)}...
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
