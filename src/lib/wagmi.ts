import { http, createConfig } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!;

// Prefer a private RPC (Alchemy / QuickNode / Infura) if configured.
// The default `https://sepolia.base.org` public RPC is rate-limited and
// drops logs under load, which breaks Merkle-tree event scans.
const baseSepoliaRpc = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC;

export const config = createConfig({
  chains: [baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [baseSepolia.id]: http(baseSepoliaRpc),
  },
});
