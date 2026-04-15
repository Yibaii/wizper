'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useAccount, useConnect, useDisconnect, useConnectors, useWriteContract } from 'wagmi';
import { keccak256, toBytes, parseAbi } from 'viem';
import { type Confession, type Link } from '@/data/mock';
import { CONTRACT_ADDRESSES } from '@/lib/contracts/config';
import { WIZPER_TOKEN_ABI, WIZPER_NFT_ABI, WIZPER_ZK_ABI } from '@/lib/contracts/abis';
import { generateNullifier, createCommitment, saveNullifier } from '@/lib/zk';

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

/* ---- App State ---- */
interface AppState {
  // Feed: minted expressions (public)
  feedExpressions: Confession[];
  // Mine: user's own expressions (minted + un-minted)
  myExpressions: Confession[];
  links: Link[];
  addConfession: (c: Confession) => void;
  deleteExpression: (id: string) => Promise<void>;
  hideExpression: (id: string) => Promise<void>;
  requestLink: (fromId: string, toId: string) => void;
  confirmLink: (linkId: string) => void;
  mintExpressionNFT: (id: string, text: string, emotion: string, svgElement?: SVGSVGElement | null) => Promise<void>;
  payForLink: () => Promise<void>;
  claimDailyReward: () => Promise<void>;
  wallet: WalletState;
  isMinting: boolean;
  refreshFeed: () => Promise<void>;
  refreshMine: () => Promise<void>;
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

  const refreshMine = useCallback(async () => {
    if (!address) {
      setMyExpressions([]);
      return;
    }
    try {
      const res = await fetch(`/api/expressions/mine?owner=${address}`);
      if (res.ok) {
        const data = await res.json();
        setMyExpressions(data.map(dbToConfession));
      }
    } catch { /* ignore */ }
  }, [address]);

  // Load feed on mount
  useEffect(() => { refreshFeed(); }, [refreshFeed]);

  // Load mine when wallet changes
  useEffect(() => { refreshMine(); }, [refreshMine]);

  // Load links on mount
  useEffect(() => {
    fetch('/api/links').then(r => r.ok ? r.json() : []).then(setLinks).catch(() => {});
  }, []);

  /* ── contract writes ── */
  const { writeContractAsync } = useWriteContract();

  /* ── Actions ── */
  const addConfession = useCallback(async (c: Confession) => {
    if (!address) return;

    await fetch('/api/expressions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: c.id,
        text: c.text,
        emotion: c.emotion,
        owner: address,
      }),
    });

    // Optimistic update for "mine"
    setMyExpressions(prev => [c, ...prev]);
  }, [address]);

  const deleteExpression = useCallback(async (id: string) => {
    if (!address) return;

    const res = await fetch('/api/expressions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, owner: address }),
    });

    if (res.ok) {
      setMyExpressions(prev => prev.filter(c => c.id !== id));
    }
  }, [address]);

  const hideExpression = useCallback(async (id: string) => {
    const res = await fetch('/api/expressions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hidden: true }),
    });

    if (res.ok) {
      setFeedExpressions(prev => prev.filter(c => c.id !== id));
    }
  }, []);

  // Mint Expression NFT
  const mintExpressionNFT = useCallback(async (id: string, text: string, emotion: string, svgElement?: SVGSVGElement | null) => {
    if (!address) throw new Error('Wallet not connected');
    setIsMinting(true);

    try {
      // Step 1: Upload wizard image + metadata to IPFS
      let tokenURI: string;

      const svgString = svgElement
        ? new XMLSerializer().serializeToString(svgElement)
        : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 80"><text y="40" font-size="8">${emotion}</text></svg>`;

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg: svgString, text, emotion, wizardId: id }),
      });

      if (res.ok) {
        const data = await res.json();
        tokenURI = data.tokenURI;
      } else {
        console.warn('IPFS upload failed, using data URI fallback');
        tokenURI = `data:application/json,${encodeURIComponent(JSON.stringify({
          name: `Wizper Spirit #${id}`,
          description: `Emotion: ${emotion}`,
        }))}`;
      }

      // Step 2: ZK Commitment
      const expressionHash = keccak256(toBytes(text));

      if (CONTRACT_ADDRESSES.wizperZK) {
        const nullifier = generateNullifier();
        const commitment = createCommitment(expressionHash, nullifier, address);

        await writeContractAsync({
          address: CONTRACT_ADDRESSES.wizperZK as `0x${string}`,
          abi: parseAbi(WIZPER_ZK_ABI as unknown as string[]),
          functionName: 'submitCommitment',
          args: [commitment, expressionHash],
        });

        saveNullifier({
          expressionId: id,
          expressionHash,
          nullifier,
          commitment,
          createdAt: new Date().toISOString(),
        });
      }

      // Step 3: Pay with WIZPER token (burn)
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.wizperToken as `0x${string}`,
        abi: parseAbi(WIZPER_TOKEN_ABI as unknown as string[]),
        functionName: 'payForMint',
      });

      // Step 4: Mint NFT with IPFS tokenURI
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.wizperNFT as `0x${string}`,
        abi: parseAbi(WIZPER_NFT_ABI as unknown as string[]),
        functionName: 'mintExpression',
        args: [address, tokenURI, expressionHash, emotion],
      });

      // Step 5: Update database
      await fetch('/api/expressions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, minted: true, tokenURI }),
      });

      // Refresh both feeds
      await Promise.all([refreshFeed(), refreshMine()]);
    } finally {
      setIsMinting(false);
    }
  }, [address, writeContractAsync, refreshFeed, refreshMine]);

  // Pay for link request
  const payForLink = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.wizperToken as `0x${string}`,
      abi: parseAbi(WIZPER_TOKEN_ABI as unknown as string[]),
      functionName: 'payForLink',
    });
  }, [address, writeContractAsync]);

  // Claim daily reward
  const claimDailyReward = useCallback(async () => {
    if (!address) throw new Error('Wallet not connected');
    await writeContractAsync({
      address: CONTRACT_ADDRESSES.wizperToken as `0x${string}`,
      abi: parseAbi(WIZPER_TOKEN_ABI as unknown as string[]),
      functionName: 'claimDailyReward',
    });
  }, [address, writeContractAsync]);

  /* ── Links ── */
  const requestLink = useCallback(async (fromId: string, toId: string) => {
    const res = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromId, toId }),
    });
    if (res.ok) {
      const link = await res.json();
      setLinks(prev => [...prev, link]);
    }
  }, []);

  const confirmLink = useCallback(async (linkId: string) => {
    const res = await fetch('/api/links', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: linkId }),
    });
    if (res.ok) {
      setLinks(prev => prev.map(l => l.id === linkId ? { ...l, status: 'confirmed' as const } : l));
    }
  }, []);

  const walletAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <AppContext.Provider
      value={{
        feedExpressions,
        myExpressions,
        links,
        addConfession,
        deleteExpression,
        hideExpression,
        requestLink,
        confirmLink,
        mintExpressionNFT,
        payForLink,
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
    createdAt: row.createdAt as string,
    linkedIds: confirmed.map(l => l.toId || l.fromId),
    pendingLinkIds: pending.map(l => l.toId || l.fromId),
  };
}
