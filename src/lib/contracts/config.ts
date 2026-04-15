// 合约地址 — 部署到 Sepolia 后替换这些值
export const CONTRACT_ADDRESSES = {
  wizperToken: process.env.NEXT_PUBLIC_WIZPER_TOKEN_ADDRESS || "",
  wizperNFT: process.env.NEXT_PUBLIC_WIZPER_NFT_ADDRESS || "",
  wizperZK: process.env.NEXT_PUBLIC_WIZPER_ZK_ADDRESS || "",
} as const;

// 链配置
export const CHAIN_CONFIG = {
  chainId: 84532, // Base Sepolia
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
  currency: {
    name: "Sepolia ETH",
    symbol: "ETH",
    decimals: 18,
  },
} as const;
