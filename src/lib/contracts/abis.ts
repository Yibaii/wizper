// WizperToken ($WIZPER) ERC-20 ABI — used by the home page daily reward.
// Other v0 contract ABIs (WizperNFT, WizperZKVerifier) were moved to
// legacy alongside their source; the current anonymous flow uses
// anonymousAbi.ts.
export const WIZPER_TOKEN_ABI = [
  // reads
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)',
  'function lastClaimTime(address) view returns (uint256)',
  // constants
  'function DAILY_REWARD() view returns (uint256)',
  'function MAX_SUPPLY() view returns (uint256)',
  // writes
  'function claimDailyReward()',
  // events
  'event DailyRewardClaimed(address indexed user, uint256 amount)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
] as const;
