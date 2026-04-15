// WizperToken ($WIZPER) ERC-20 ABI — 只包含前端需要的函数
export const WIZPER_TOKEN_ABI = [
  // 读取
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function lastClaimTime(address) view returns (uint256)",
  // 常量
  "function MINT_COST() view returns (uint256)",
  "function LINK_COST() view returns (uint256)",
  "function DAILY_REWARD() view returns (uint256)",
  "function MAX_SUPPLY() view returns (uint256)",
  // 写入
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function payForMint()",
  "function payForLink()",
  "function claimDailyReward()",
  // 事件
  "event ExpressionMintPaid(address indexed user, uint256 amount)",
  "event LinkRequestPaid(address indexed user, uint256 amount)",
  "event DailyRewardClaimed(address indexed user, uint256 amount)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
] as const;

// WizperNFT ERC-721 ABI — 只包含前端需要的函数
export const WIZPER_NFT_ABI = [
  // 读取
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function totalMinted() view returns (uint256)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function getExpression(uint256 tokenId) view returns (bytes32 expressionHash, string emotion, uint256 mintedAt)",
  "function hashMinted(bytes32) view returns (bool)",
  // 写入
  "function mintExpression(address to, string uri, bytes32 expressionHash, string emotion) returns (uint256)",
  // 事件
  "event ExpressionMinted(uint256 indexed tokenId, address indexed owner, bytes32 expressionHash, string emotion)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
] as const;

// WizperZKVerifier ABI
export const WIZPER_ZK_ABI = [
  // 读取
  "function commitments(bytes32) view returns (bool)",
  "function proofVerified(bytes32) view returns (bool)",
  "function isVerified(bytes32 expressionHash) view returns (bool)",
  "function hasCommitment(bytes32 commitment) view returns (bool)",
  "function totalCommitments() view returns (uint256)",
  "function totalVerifications() view returns (uint256)",
  // 写入
  "function submitCommitment(bytes32 commitment, bytes32 expressionHash)",
  "function verifyProof(bytes32 expressionHash, bytes32 nullifier, address author) returns (bool)",
  // 事件
  "event CommitmentSubmitted(bytes32 indexed commitment, bytes32 indexed expressionHash)",
  "event ProofVerified(bytes32 indexed expressionHash, bytes32 indexed nullifierHash)",
] as const;
