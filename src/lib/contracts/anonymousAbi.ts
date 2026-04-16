/**
 * ABI for WizperAnonymous.sol — the Semaphore-backed anonymous NFT contract.
 *
 * Using parseAbi-compatible string signatures so it matches the convention
 * already used in abis.ts. The SemaphoreProof struct is declared so viem
 * can pack it correctly.
 */
export const WIZPER_ANONYMOUS_ABI = [
  // Struct matches ISemaphore.SemaphoreProof
  'struct SemaphoreProof { uint256 merkleTreeDepth; uint256 merkleTreeRoot; uint256 nullifier; uint256 message; uint256 scope; uint256[8] points; }',

  // Reads — spirits + meta
  'function groupId() view returns (uint256)',
  'function initialized() view returns (bool)',
  'function soulbound() view returns (bool)',
  'function totalMinted() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenByIndex(uint256 index) view returns (uint256)',
  'function totalSupply() view returns (uint256)',
  'function hashMinted(bytes32 hash) view returns (bool)',
  'function getSpirit(uint256 tokenId) view returns (bytes32 expressionHash, string emotion, uint256 mintedAt)',

  // Reads — link
  'function LINK_REQUEST_TYPEHASH() view returns (bytes32)',
  'function LINK_CONFIRM_TYPEHASH() view returns (bytes32)',
  'function linkId(uint256 fromTokenId, uint256 toTokenId) pure returns (bytes32)',
  // LinkStatus { None, Pending, Confirmed } is encoded as uint8 in ABI.
  'function getLink(bytes32 id) view returns (uint256 fromTokenId, uint256 toTokenId, uint8 status, uint64 requestedAt, uint64 confirmedAt)',
  'function getLinksForToken(uint256 tokenId) view returns (bytes32[])',

  // Writes
  'function initialize()',
  'function joinGroup(uint256 identityCommitment)',
  'function mintSpirit(SemaphoreProof proof, address stealthOwner, string uri, bytes32 expressionHash, string emotion) returns (uint256)',
  'function requestLink(uint256 fromTokenId, uint256 toTokenId, bytes signature) returns (bytes32)',
  'function confirmLink(uint256 fromTokenId, uint256 toTokenId, bytes signature)',

  // Events
  'event GroupInitialized(uint256 indexed groupId)',
  'event MemberJoined(uint256 identityCommitment)',
  'event SpiritMinted(uint256 indexed tokenId, address indexed stealthOwner, bytes32 expressionHash, string emotion)',
  'event LinkRequested(bytes32 indexed linkId, uint256 indexed fromTokenId, uint256 indexed toTokenId)',
  'event LinkConfirmed(bytes32 indexed linkId, uint256 indexed fromTokenId, uint256 indexed toTokenId)',
] as const;
