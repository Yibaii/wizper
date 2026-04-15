# Wizper

> Where Emotions Become Spirits

Wizper is a Web3 anonymous expression platform with a retro pixel-art aesthetic. Users write anonymous expressions that are automatically transformed into unique procedurally-generated wizard characters. These wizards can be minted as NFTs on-chain, with identity privacy protected by a Zero-Knowledge commitment scheme.

**Live on Base Sepolia Testnet**

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Smart Contracts](#smart-contracts)
- [Zero-Knowledge Proof System](#zero-knowledge-proof-system)
- [Procedural Wizard Generation](#procedural-wizard-generation)
- [Emotion Detection Algorithm](#emotion-detection-algorithm)
- [NFT Minting Flow](#nft-minting-flow)
- [IPFS Storage](#ipfs-storage)
- [Token Economics](#token-economics)
- [Project Structure](#project-structure)
- [Setup & Deployment](#setup--deployment)

---

## Architecture Overview

```
+------------------+       +-------------------+       +------------------------+
|                  |       |                   |       |   Smart Contracts      |
|   Next.js App    |------>|   API Routes      |       |   (Base Sepolia)       |
|   (Frontend)     |       |   /api/upload     |       |                        |
|                  |       +--------+----------+       |  WizperToken (ERC-20)  |
|  - wagmi/viem    |                |                  |  WizperNFT   (ERC-721) |
|  - WizardChar    |                v                  |  WizperZKVerifier      |
|  - ZK lib        |       +-------------------+       +-----------+------------+
|                  |       |   Pinata / IPFS   |                   ^
+--------+---------+       |   (SVG + metadata)|                   |
         |                 +-------------------+                   |
         |                                                         |
         +-------- MetaMask (wallet + tx signing) ----------------+
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Animations | Framer Motion |
| Wallet | wagmi 3, viem 2 |
| Smart Contracts | Solidity 0.8.20+, OpenZeppelin |
| Deployment | Remix IDE on Base Sepolia (Chain ID: 84532) |
| Storage | IPFS via Pinata SDK |
| ZK Privacy | Hash-based Commitment Scheme (keccak256) |
| Fonts | Press Start 2P, Zpix |

---

## Core Features

### 1. Anonymous Expression Creation
Users write anonymous expressions (up to 280 characters). An emotion detection algorithm automatically categorizes each expression into one of 6 emotions, and a unique wizard character is procedurally generated from the text.

### 2. NFT Minting
Expressions can be minted as ERC-721 NFTs. The wizard SVG image and metadata are uploaded to IPFS, and the NFT's `tokenURI` points to the immutable IPFS content.

### 3. ZK Privacy Protection
When minting, a zero-knowledge commitment is submitted on-chain. This allows users to later prove they authored an expression without revealing their wallet address.

### 4. Connection Graph
Users can request "magical links" between expressions that share similar emotions. Confirmed connections are visualized in a force-directed graph with animated particles.

### 5. Token Economy
The platform is powered by $WIZPER (ERC-20), with burn mechanics for minting and linking, and daily sign-in rewards.

---

## Smart Contracts

### WizperToken ($WIZPER) — ERC-20

**Address:** `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce`

An ERC-20 token with burn mechanics, built on OpenZeppelin's `ERC20`, `ERC20Burnable`, and `Ownable`.

```solidity
contract WizperToken is ERC20, ERC20Burnable, Ownable {
    uint256 public constant MINT_COST    =  5 * 10 ** 18;  // 5 WIZPER to mint NFT
    uint256 public constant LINK_COST    =  2 * 10 ** 18;  // 2 WIZPER to request link
    uint256 public constant DAILY_REWARD =  6 * 10 ** 18;  // 6 WIZPER daily sign-in
    uint256 public constant MAX_SUPPLY   = 100_000_000 * 10 ** 18;
}
```

**Key Functions:**
| Function | Description |
|----------|-------------|
| `payForMint()` | Burns 5 WIZPER from caller. Called before NFT minting. |
| `payForLink()` | Burns 2 WIZPER from caller. Called before link request. |
| `claimDailyReward()` | Mints 6 WIZPER to caller. 24-hour cooldown enforced via `lastClaimTime` mapping. |
| `airdrop(to, amount)` | Owner-only. Mints tokens to a target address (capped by `MAX_SUPPLY`). |

**Initial Distribution:** 10,000,000 WIZPER (10%) minted to deployer at construction.

---

### WizperNFT — ERC-721

**Address:** `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95`

An ERC-721 NFT contract where each token represents a minted expression. Built on OpenZeppelin's `ERC721URIStorage`.

```solidity
struct ExpressionData {
    bytes32 expressionHash;   // keccak256 of the expression text
    string  emotion;          // anger | sadness | joy | fear | love | confusion
    uint256 mintedAt;         // block.timestamp at mint time
}
```

**Key Functions:**
| Function | Description |
|----------|-------------|
| `mintExpression(to, uri, expressionHash, emotion)` | Mints a new NFT. `uri` points to IPFS metadata. `expressionHash` prevents duplicate mints via `hashMinted` mapping. |
| `getExpression(tokenId)` | Returns the expression data for a given token. |
| `totalMinted()` | Returns the total number of minted NFTs. |

**Duplicate Prevention:** `mapping(bytes32 => bool) public hashMinted` ensures the same expression text cannot be minted twice.

---

### WizperZKVerifier — Zero-Knowledge Verifier

**Address:** `0x128C66125fD13910948191e23f0b5a2531D161E7`

Implements a hash-based commitment scheme for anonymous authorship proof. See [Zero-Knowledge Proof System](#zero-knowledge-proof-system) for full details.

**Key Functions:**
| Function | Description |
|----------|-------------|
| `submitCommitment(commitment, expressionHash)` | Stores a ZK commitment on-chain during minting. |
| `verifyProof(expressionHash, nullifier, author)` | Verifies ownership by reconstructing the commitment. Single-use per nullifier. |
| `isVerified(expressionHash)` | Checks if an expression has been ZK-verified. |

---

## Zero-Knowledge Proof System

Wizper uses a **hash-based commitment scheme** to allow users to prove they authored an expression without revealing their wallet address.

### Protocol

#### Phase 1: Commitment (during Mint)

```
Input:
  expression_text  — the raw expression string
  author           — user's wallet address (private, not stored)

Process:
  1. expressionHash  = keccak256(expression_text)
  2. nullifier       = random 32 bytes (generated client-side via crypto.getRandomValues)
  3. commitment      = keccak256(expressionHash || nullifier || author)
                       using abi.encodePacked (Solidity-compatible)

On-chain:
  4. submitCommitment(commitment, expressionHash) → stores commitment

Client-side:
  5. Save nullifier to localStorage (user's secret key for later proof)
```

#### Phase 2: Verification (proving ownership)

```
Input:
  expressionHash  — public, from the NFT
  nullifier       — user's secret, from localStorage
  author          — the address claiming ownership

Process:
  1. Reconstruct: commitment' = keccak256(expressionHash || nullifier || author)
  2. Check: commitment' exists in commitments mapping
  3. Check: nullifier not previously used (replay protection)
  4. Mark nullifier as used, mark expression as verified

Output:
  valid = true  → proves (author) wrote (expressionHash) without on-chain link
```

### Security Properties

| Property | Guarantee |
|----------|-----------|
| **Hiding** | The commitment reveals nothing about the author. Given `commitment = H(expressionHash, nullifier, author)`, an observer cannot reverse the hash to find `author`. |
| **Binding** | The commitment is bound to a specific (expression, author) pair. A different author cannot produce the same commitment without knowing the nullifier. |
| **Replay Protection** | Each nullifier can only be used once. `nullifierUsed[H(nullifier)]` prevents reuse. |
| **Non-correlation** | Multiple expressions by the same author have independent random nullifiers, making them unlinkable. |

### Formulas

```
hashStr(s) = (((h << 5) - h) + charCode) | 0    // for each character, signed 32-bit

expressionHash = keccak256(bytes(expression_text))

nullifier = crypto.getRandomValues(new Uint8Array(32))

commitment = keccak256(abi.encodePacked(
    bytes32 expressionHash,
    bytes32 nullifier,
    address author
))
```

---

## Procedural Wizard Generation

Each expression deterministically generates a unique wizard character as an SVG. The generation is purely based on the text content — the same text always produces the same wizard.

### Hash Function

```javascript
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
```

This produces a deterministic 32-bit integer from any string.

### Trait Selection

Each trait is selected using the hash with a unique offset to decorrelate choices:

```javascript
pick(array, offset) = array[(hash + offset) % array.length]
```

| Trait | Options | Count | Selection |
|-------|---------|-------|-----------|
| Robe Color | purple, teal, crimson, blue, gold, green, brown, silver | 8 | `(h + 0) % 8` |
| Skin Color | 5 skin tones | 5 | `(h + 7) % 5` |
| Beard Color | white, grey, brown, dark, black, gold, red | 7 | `(h + 13) % 7` |
| Staff Top | orb, crystal, flame, star, crescent | 5 | `(h + 19) % 5` |
| Hat Style | pointed, wide, hooded, crown | 4 | `(h + 23) % 4` |
| Eye Type | dot, glowing, highlight, narrow | 4 | `h % 4` |
| Has Beard | yes/no | 2 | `h % 3 !== 0` (67% chance) |
| Has Staff | yes/no | 2 | `h % 4 !== 0` (75% chance) |
| Has Cat | yes/no | 2 | `h % 7 === 0` (14% chance) |

### Total Combinations

```
8 x 5 x 7 x 5 x 4 x 4 x 2 x 2 x 2 = 179,200 unique wizards
```

### SVG Structure

Each wizard is rendered as a 64x80 pixel-art SVG with `shapeRendering="crispEdges"`:

```
Layer order (back to front):
  1. Ambient glow circle
  2. Staff (if present)
  3. Hat (4 styles: pointed/wide/hooded/crown)
  4. Face (skin-colored rectangle)
  5. Eyes (4 variants)
  6. Beard (if present)
  7. Body / Robe with belt detail
  8. Arms + Hands
  9. Feet
  10. Cat companion (if present)
  11. Accent sparkles
```

---

## Emotion Detection Algorithm

Expressions are classified into 6 emotions using keyword matching:

```javascript
function detectEmotion(text: string): Emotion {
  // Score each emotion by counting keyword matches
  for each emotion in [anger, sadness, joy, fear, love, confusion]:
    score[emotion] = count of matching keywords in text

  return emotion with highest score (default: confusion)
}
```

### Keyword Table

| Emotion | Keywords | Icon |
|---------|----------|------|
| Anger | angry, furious, rage, hate, scream, mad, frustrated | fire |
| Sadness | sad, cry, tears, lonely, miss, depressed, grief, alone | droplet |
| Joy | happy, smile, laugh, amazing, wonderful, joy, glad, bright, courage | sparkles |
| Fear | afraid, scared, fear, anxiety, worry, nervous, dread, panic | eye |
| Love | love, heart, crush, letter, kiss, adore, romance, dear | purple heart |
| Confusion | confused, lost, why, spinning, understand, unsure, uncertain | swirl |

If no keywords match, the default emotion is **confusion**.

---

## NFT Minting Flow

The complete minting process involves 4 on-chain transactions:

```
User clicks "Mint NFT"
        |
        v
[1] Upload to IPFS (off-chain)
    - Serialize wizard SVG from DOM (XMLSerializer)
    - POST /api/upload → Pinata SDK
    - Upload SVG image → get imageCID
    - Build ERC-721 metadata JSON:
        { name, description, image: "ipfs://{imageCID}", attributes: [...] }
    - Upload metadata → get metadataCID
    - tokenURI = "ipfs://{metadataCID}"
        |
        v
[2] Submit ZK Commitment (on-chain tx #1)
    - Generate random nullifier
    - Compute commitment = keccak256(expressionHash, nullifier, author)
    - Call WizperZKVerifier.submitCommitment(commitment, expressionHash)
    - Save nullifier to localStorage
        |
        v
[3] Pay with WIZPER (on-chain tx #2)
    - Call WizperToken.payForMint()
    - Burns 5 WIZPER from user's balance
        |
        v
[4] Mint NFT (on-chain tx #3)
    - expressionHash = keccak256(expression_text)
    - Call WizperNFT.mintExpression(to, tokenURI, expressionHash, emotion)
    - NFT is minted to user's address
    - tokenURI points to IPFS metadata
        |
        v
    Mint Complete
```

---

## IPFS Storage

NFT assets are stored on IPFS via [Pinata](https://www.pinata.cloud/) for permanent, decentralized storage.

### API Route: `POST /api/upload`

```
Request Body:
{
  svg: string,        // Serialized SVG string
  text: string,       // Expression text
  emotion: string,    // Detected emotion
  wizardId: string    // Unique ID
}

Response:
{
  tokenURI: "ipfs://Qm...",      // Metadata URI (used in NFT contract)
  imageURI: "ipfs://Qm...",      // Image URI
  imageCid: "Qm...",
  metadataCid: "Qm..."
}
```

### NFT Metadata Format (ERC-721 Standard)

```json
{
  "name": "Wizper Spirit #c-1713100000000",
  "description": "An anonymous expression transformed into a magical wizard spirit. Emotion: joy",
  "image": "ipfs://QmImageCID...",
  "attributes": [
    { "trait_type": "Emotion", "value": "joy" },
    { "trait_type": "Text Length", "value": 142 },
    { "trait_type": "Created", "value": "2026-04-14T..." }
  ]
}
```

---

## Token Economics

### $WIZPER Token Overview

| Parameter | Value |
|-----------|-------|
| Name | Wizper |
| Symbol | WIZPER |
| Standard | ERC-20 |
| Max Supply | 100,000,000 WIZPER |
| Initial Mint | 10,000,000 (10% to deployer) |
| Decimals | 18 |

### Burn Mechanics (Deflationary)

| Action | Cost | Mechanism |
|--------|------|-----------|
| Mint Expression NFT | 5 WIZPER | Burned via `payForMint()` |
| Request Link | 2 WIZPER | Burned via `payForLink()` |

### Reward Mechanics (Inflationary)

| Action | Reward | Constraint |
|--------|--------|-----------|
| Daily Sign-in | 6 WIZPER | 24-hour cooldown per address, capped by MAX_SUPPLY |
| Airdrop | Variable | Owner-only, capped by MAX_SUPPLY |

### Supply Dynamics

```
Effective Supply = Initial Mint + Daily Rewards + Airdrops - Mint Burns - Link Burns

Since burns are permanent and rewards are capped, the token has controlled inflation
with deflationary pressure from active usage.
```

---

## Project Structure

```
wizper/
├── contracts/                    # Solidity smart contracts
│   ├── WizperToken.sol           # $WIZPER ERC-20 token
│   ├── WizperNFT.sol             # Expression NFT (ERC-721)
│   ├── WizperZKVerifier.sol      # ZK commitment verifier
│   └── DEPLOY_GUIDE.md           # Remix deployment instructions
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Home / landing page
│   │   ├── create/page.tsx       # Expression creation
│   │   ├── feed/page.tsx         # Expression gallery
│   │   ├── connections/page.tsx  # Connection graph visualization
│   │   ├── confession/[id]/     # Expression detail + mint
│   │   ├── api/upload/route.ts  # IPFS upload API
│   │   ├── layout.tsx           # Root layout with providers
│   │   └── globals.css          # Theme & global styles
│   │
│   ├── components/
│   │   ├── Web3Provider.tsx      # wagmi + react-query provider
│   │   ├── confession/
│   │   │   ├── CreateForm.tsx    # 3-phase creation UI
│   │   │   ├── ConfessionCard.tsx
│   │   │   ├── WizardCharacter.tsx  # Procedural SVG wizard
│   │   │   └── EmotionCharacter.tsx
│   │   ├── connection/
│   │   │   ├── ConnectionGraph.tsx  # Canvas force-directed graph
│   │   │   └── LinkRequestCard.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx        # Nav with wallet picker
│   │   │   ├── PixelLandscape.tsx
│   │   │   └── ParticleBackground.tsx
│   │   └── ui/
│   │       ├── PotionButton.tsx
│   │       ├── PixelModal.tsx
│   │       ├── MintBadge.tsx
│   │       ├── ZKShield.tsx      # ZK status indicator
│   │       ├── ScrollPanel.tsx
│   │       └── PixelPlanet.tsx
│   │
│   ├── context/
│   │   ├── AppContext.tsx        # App state + contract interactions
│   │   └── ThemeContext.tsx      # Day/night theme
│   │
│   ├── lib/
│   │   ├── zk.ts                # ZK commitment utilities
│   │   ├── pinata.ts            # Pinata IPFS client
│   │   ├── wagmi.ts             # wagmi configuration
│   │   ├── emotions.ts          # Emotion detection + palettes
│   │   ├── utils.ts             # cn, truncate, formatDate
│   │   └── contracts/
│   │       ├── abis.ts          # Contract ABIs
│   │       └── config.ts        # Contract addresses + chain config
│   │
│   └── data/
│       └── mock.ts              # Sample data + type definitions
│
├── .env.local                   # Environment variables (not committed)
├── .env.local.example           # Environment template
├── package.json
└── tsconfig.json
```

---

## Setup & Deployment

### Prerequisites

- Node.js 18+
- pnpm
- MetaMask browser extension
- Base Sepolia testnet ETH ([faucet](https://www.alchemy.com/faucets/base-sepolia))

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Deploy Smart Contracts

Open [Remix IDE](https://remix.ethereum.org) and deploy each contract to Base Sepolia:

1. **WizperToken.sol** — Compile with Solidity 0.8.34+, deploy via Browser Extension (MetaMask)
2. **WizperNFT.sol** — Same process
3. **WizperZKVerifier.sol** — Same process

Copy each deployed contract address.

### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

Fill in the contract addresses and Pinata credentials:

```env
NEXT_PUBLIC_WIZPER_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_NFT_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_ZK_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
```

### 4. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

### 5. Test the Flow

1. Connect MetaMask (Base Sepolia network)
2. Import WIZPER token in MetaMask (use token contract address, decimals: 18)
3. Airdrop WIZPER to your address via Remix if needed
4. Create an expression at `/create`
5. Click "Mint NFT" — confirm 3 MetaMask transactions
6. View your minted NFT in the feed

---

## Deployed Contracts (Base Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| WizperToken | `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce` | [View](https://sepolia.basescan.org/address/0x4b86023466B8098aAE12D399543e35B42E0ab2Ce) |
| WizperNFT | `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95` | [View](https://sepolia.basescan.org/address/0xE917Ba47a22c15840eAEC0a644330F76C2edaD95) |
| WizperZKVerifier | `0x128C66125fD13910948191e23f0b5a2531D161E7` | [View](https://sepolia.basescan.org/address/0x128C66125fD13910948191e23f0b5a2531D161E7) |
