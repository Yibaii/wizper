# Wizper

> Anonymous spirits, verifiable without identity.

[English](#english) | [中文](#中文)

Wizper lets people write short emotional expressions that are minted as soulbound NFTs without any on-chain link to the author's wallet. Identity is proven with a Semaphore zero-knowledge proof; gas is paid by a relayer; NFTs are owned by a stealth address derived from the user's identity secret.

**Network:** Base Sepolia · **Chain ID:** 84532

> Looking for the old design (main-wallet mint, `$WIZPER` tokenomics, hash-commitment ZK)? See [README.legacy.md](./README.legacy.md).

---

<a id="中文"></a>

## 中文

### 简介

Wizper 是一个 Web3 匿名情绪表达平台。用户写一段话，系统生成一个独一无二的像素巫师，mint 成 NFT。**主钱包和任何一条 spirit 都没有链上关联**——身份由 Semaphore 零知识证明匿名验证，gas 由 relayer 代付，NFT 归属于从 identity secret 派生的 stealth address。

**运行在 Base Sepolia 测试网（Chain ID 84532）。**

---

### 目录

- [为什么这样做](#为什么这样做)
- [架构概览](#架构概览)
- [关键流程](#关键流程)
- [技术栈](#技术栈)
- [智能合约](#智能合约)
- [数据库角色](#数据库角色)
- [项目结构](#项目结构)
- [本地运行](#本地运行)
- [已知限制](#已知限制)

---

### 为什么这样做

传统 Web3 社交应用让用户用主钱包发帖：钱包地址永远是链上 `ownerOf(tokenId)` 的答案，任何人通过 BaseScan、Chainalysis、钱包分析工具都能把"这个帐号发了什么"和"这个人是谁"连起来。再加一层哈希承诺（我们的旧方案）治标不治本。

**Wizper 把三块匿名性解耦：**

1. **成员身份**：用 Semaphore 加入一个匿名群。主钱包签**一次** tx 证明"我是群里某人"，但链上**不记录"谁是哪个成员"**。
2. **作者身份**：每次 mint 生成一条 Semaphore ZK 证明 + 一条随机 nullifier。合约只看到"某个群成员发了某个 signal"，不知道是哪个。
3. **资产归属**：NFT mint 到从 identity secret 确定性派生出的 stealth address。这个地址的私钥只有用户能算出来，但和主钱包无链上关联。

结果：运营方（我们）从后端或链上都**无法去匿名化用户**。

---

### 架构概览

```
+---------------------+                              +--------------------------+
|                     |   Semaphore proof + mint     |                          |
|   Next.js 前端       |   params (stealthOwner,      |                          |
|                     |   tokenURI, ...)             |                          |
|   - identity (LS)   | ---------------------------> |  Relayer (hot wallet)    |
|   - stealth derive  |                              |  /api/relay/{mint,link}  |
|   - ZK proof gen    |                              |                          |
|   - ECDSA sign      | <---- tx hash -------------- |  付 gas, 不验签, 只转发    |
+---------+-----------+                              +------------+-------------+
          |                                                       |
          |                                                       v
          |                                        +--------------------------+
          |                                        |  WizperAnonymous.sol     |
          |                                        |  (Base Sepolia)          |
          |     IPFS                               |                          |
          |  (Pinata: SVG +                        |  Semaphore.validateProof |
          |   JSON metadata 含 text)               |  mintSpirit (ERC-721)    |
          | <------------------------------------> |  joinGroup               |
          |                                        |  request/confirmLink     |
          +------------- 读事件: SpiritMinted, ---- +                          |
                          LinkRequested/Confirmed                              |
                                                                               
                                                   +--------------------------+
                                                   |  Semaphore (PSE 部署)     |
                                                   |  0x8A1fd199...c693D      |
                                                   +--------------------------+
```

**辅助层（可选 cache）**：Supabase Postgres 存一份 Expression 和 Link 的只读缓存，`owner` 字段 = stealth address（不再是主钱包）。feed 查询走 cache，失败时可以用 `scripts/recover-missing-mints.mjs` 从链上事件重建。

---

### 关键流程

#### 1. 加入 Wizper 群 (`/join`，每用户一次)

```
客户端：
  identity = new Identity()                      // 随机 32B secret
  localStorage["wizper_semaphore_identity_v1"] = identity.export()
  stealthAddr = privateKeyToAccount(
      keccak256("wizper-stealth-v1:" + secret)
  ).address

  // 用户备份 secret（导出 JSON 或复制），然后：
  await writeContract(WizperAnonymous, "joinGroup", [identity.commitment])
  // ← 主钱包签一笔 tx。链上只能看到"某个钱包加入了 Wizper 群"。
```

#### 2. 匿名 mint (`/create`)

```
1. 上传 text + SVG + metadata 到 IPFS
   → tokenURI = "ipfs://{cid}"
2. 拉链上最新 MemberJoined 事件，重建 Semaphore 群
3. 生成 Semaphore proof，binding:
     - stealthOwner（Merkle tree 成员）
     - tokenURI + expressionHash + emotion (signal)
     - scope = expressionHash（scope 相同 = 禁止同一 identity 重复 mint 同一文本）
4. POST /api/relay/mint { proof, stealthOwner, tokenURI, ... }
5. Relayer 钱包调用 mintSpirit(...)
6. 合约：Semaphore.validateProof → mint NFT 给 stealthOwner
7. 前端解析 SpiritMinted 事件拿 tokenId，写 DB cache
```

**主钱包零签名**。浏览器层面用户只看到"发布中 → 完成"。

#### 3. Link 两个 spirit

Link 用**stealth 私钥 ECDSA 签名**，不再用 ZK：

```
发起方（tokenA 的 owner）：
  stealthKey_A.signMessage(
    keccak256(abi.encode(LINK_REQUEST_TYPEHASH, chainId, contract, A, B))
  )
  → POST /api/relay/link { kind: 'request', fromTokenId: A, toTokenId: B, sig }

合约 requestLink(A, B, sig)：
  require(ecrecover(digest) == ownerOf(A))       // stealth 地址是公开的
  links[linkId(A,B)].status = Pending

接受方（tokenB 的 owner，类似流程）：
  → POST /api/relay/link { kind: 'confirm', ... }

合约 confirmLink(A, B, sig)：
  require(ecrecover == ownerOf(B))
  links[...].status = Confirmed
```

前端智能化：如果用户在 B 的详情页看到"A 请求了 link"，按钮会变 **"Accept Link"**——点一次等同于 confirm，避免建立反向重复。

---

### 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| 钱包 | wagmi 3, viem 2, MetaMask / WalletConnect |
| 匿名 ZK | `@semaphore-protocol/identity`, `@semaphore-protocol/group`, `@semaphore-protocol/proof` (v4) |
| 合约 | Solidity 0.8.23+, OpenZeppelin v5 (ERC-721 Enumerable + URIStorage), Semaphore v4 contracts |
| 部署 | Remix（一次性）到 Base Sepolia |
| 情绪分析 | HuggingFace Inference Providers router<br>— 英文：`j-hartmann/emotion-english-distilroberta-base`<br>— 中文：`Johnson8187/Chinese-Emotion`<br>自动按 CJK 字符检测语言 |
| 存储 | IPFS via Pinata (SVG + ERC-721 metadata including full `text`) |
| 数据库 | Prisma 5 + Supabase PostgreSQL（只作 cache，非 source of truth） |
| Relayer | Node hot wallet（存于环境变量），代付 gas |

---

### 智能合约

主合约：**[contracts/WizperAnonymous.sol](contracts/WizperAnonymous.sol)**

部署到 Base Sepolia，引用 PSE 官方 Semaphore 部署 `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`。

#### 状态

```solidity
ISemaphore public immutable semaphore;
uint256 public groupId;                        // 初始化后固定
bool public immutable soulbound;               // 部署时决定，生产设为 true

// NFT
mapping(uint256 => SpiritData) public spirits;  // tokenId → 哈希/情绪/时间
mapping(bytes32 => bool) public hashMinted;    // 防同文本重复 mint

// Link
enum LinkStatus { None, Pending, Confirmed }
mapping(bytes32 => LinkData) public links;     // keccak(from,to) → 状态
mapping(uint256 => bytes32[]) public linksByToken;
```

#### 函数

| 函数 | 谁调 | 作用 |
|---|---|---|
| `initialize()` | owner 一次性 | 在 Semaphore 建一个新 group，本合约作 admin |
| `joinGroup(uint256 commitment)` | 任何地址 | 把 identity commitment 加入 Merkle tree |
| `mintSpirit(proof, stealthOwner, uri, expressionHash, emotion)` | 通常是 relayer | 验 proof + mint ERC-721 到 stealth 地址 |
| `requestLink(from, to, sig)` | 通常是 relayer | 验 sig 来自 ownerOf(from)，标记 Pending |
| `confirmLink(from, to, sig)` | 通常是 relayer | 验 sig 来自 ownerOf(to)，标记 Confirmed |

#### 事件

```solidity
event GroupInitialized(uint256 indexed groupId);
event MemberJoined(uint256 identityCommitment);
event SpiritMinted(uint256 indexed tokenId, address indexed stealthOwner,
                   bytes32 expressionHash, string emotion);
event LinkRequested(bytes32 indexed linkId, uint256 indexed fromTokenId,
                    uint256 indexed toTokenId);
event LinkConfirmed(bytes32 indexed linkId, uint256 indexed fromTokenId,
                    uint256 indexed toTokenId);
```

前端基于这些事件重建所有状态（identity 成员资格、我的 spirits、link 图）。

---

### 数据库角色

**DB 是可选 cache，不是 source of truth**。所有数据都能从链上事件 + IPFS metadata 重建。

```prisma
model Expression {
  id        String   @id         // 客户端生成 c-{timestamp} 或 recovered-{tokenId}
  text      String                // 完整文本（冗余；IPFS metadata 里也有）
  emotion   String                // anger | sadness | joy | fear | confusion
  minted    Boolean  @default(false)
  hidden    Boolean  @default(false)
  owner     String                // stealth address（小写）
  tokenId   String?               // ERC-721 id，十进制字符串
  tokenURI  String?
  txHash    String?
  createdAt DateTime @default(now())
  mintedAt  DateTime?
}

model Link {
  id     String @id
  fromId String
  toId   String
  status String @default("pending")   // pending | confirmed
}
```

**注意：Link 表目前未被新 flow 写入**，前端链接状态直接扫 `LinkRequested` / `LinkConfirmed` 事件。保留只为向后兼容。

**恢复机制**：如果链上 mint 成功但 DB 没写入（比如 POST 500），跑一次 [`scripts/recover-missing-mints.mjs`](scripts/recover-missing-mints.mjs) 从事件 + IPFS 重建 DB 记录。

---

### 项目结构

```
wizper/
├── contracts/
│   ├── WizperAnonymous.sol          # ★ 主合约（Phase 1）
│   ├── WizperToken.sol              # 保留：首页 daily reward 还在用
│   ├── ZK_POC_GUIDE.md              # Phase 0 POC 部署/测试指南
│   └── legacy/                      # v0 标本，不部署，仅供参考
│       ├── README.md
│       ├── WizperNFT.sol
│       ├── WizperZKVerifier.sol
│       └── DEPLOY_GUIDE.md
│
├── scripts/
│   ├── gen-relayer.mjs              # 生成 relayer 私钥
│   ├── recover-missing-mints.mjs    # 事件 → DB 重建
│   ├── dedupe-expressions.mjs       # DB 去重（同 owner+text）
│   └── debug-*.mjs                  # 调试辅助
│
├── prisma/schema.prisma             # Expression + Link
│
├── src/
│   ├── app/
│   │   ├── page.tsx                 # 首页
│   │   ├── join/page.tsx            # ★ 身份 onboarding
│   │   ├── create/page.tsx          # 匿名 mint
│   │   ├── feed/page.tsx            # 公共 feed
│   │   ├── my/page.tsx              # 我的 spirits（stealth 地址持有）
│   │   ├── connections/page.tsx     # Link 图 + inbound 提醒
│   │   ├── confession/[id]/page.tsx # 详情 + link 操作
│   │   ├── zk-poc/page.tsx          # Phase 0 POC 测试页（dev only）
│   │   └── api/
│   │       ├── emotion/             # HuggingFace 代理（双语）
│   │       ├── expressions/         # cache CRUD
│   │       ├── relay/
│   │       │   ├── mint/            # ★ 匿名 mint relayer
│   │       │   └── link/            # ★ link request/confirm relayer
│   │       └── upload/              # Pinata IPFS 上传
│   │
│   ├── components/
│   │   ├── confession/              # 创作表单 / 巫师角色 / 卡片
│   │   ├── connection/              # 力导向图 + 链接卡
│   │   ├── layout/                  # Navbar（含 inbound badge）
│   │   └── ui/
│   │
│   ├── context/
│   │   └── AppContext.tsx           # ★ 状态中枢（identity / links / mint）
│   │
│   └── lib/
│       ├── semaphore.ts             # identity + proof 辅助
│       ├── stealth.ts               # stealth address 派生
│       ├── link.ts                  # link 签名 + linkId 计算
│       ├── emotions.ts              # UI 调色板 + 情绪 label
│       ├── contracts/
│       │   ├── anonymousAbi.ts      # WizperAnonymous ABI
│       │   └── config.ts            # 合约地址 + 链配置
│       └── legacy/                  # v0 标本，不导入
│           ├── README.md
│           └── zk.ts                # 老的哈希承诺 helper
│
├── .env.local                       # RELAYER_PRIVATE_KEY, 合约地址, Pinata, DB, HF token
└── package.json
```

---

### 本地运行

#### 前置

- Node 18+、pnpm
- MetaMask 切到 Base Sepolia（chainId 84532）
- 主钱包有少量 Base Sepolia ETH（仅 joinGroup 用）
- Pinata JWT、HuggingFace API Token、Supabase DATABASE_URL

#### 环境变量（`.env.local`）

```env
# Chain
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS=0x...     # 部署 WizperAnonymous 后填
NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK=40295190       # 可选；告诉 indexer 从哪块扫

# Relayer hot wallet (Node 端, 不带 NEXT_PUBLIC_)
RELAYER_PRIVATE_KEY=0x...

# IPFS
PINATA_JWT=...
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud

# DB
DATABASE_URL=postgresql://...

# Emotion detection
HUGGINGFACE_API_TOKEN=hf_...
```

#### 启动顺序

```bash
pnpm install
npx prisma db push          # 创建/同步表
pnpm prisma generate        # 生成 Prisma client

# 生成 relayer 钱包
node scripts/gen-relayer.mjs
# 把地址存起来，向它转 ~0.05 Base Sepolia ETH
# 私钥填进 RELAYER_PRIVATE_KEY

# 启动
pnpm dev
```

#### 部署合约（一次性）

1. Remix 打开 [contracts/WizperAnonymous.sol](contracts/WizperAnonymous.sol)
2. Compiler 0.8.23+，Environment: `Injected Provider - MetaMask` (Base Sepolia)
3. Deploy 参数：
   - `semaphoreAddress`: `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`
   - `_soulbound`: `true`
4. 部署后调用 `initialize()` 一次（创建 Semaphore group）
5. 把合约地址和部署块号写进 `.env.local`

详细步骤见 [contracts/ZK_POC_GUIDE.md](contracts/ZK_POC_GUIDE.md)。

---

### 已知限制

**当前（Phase 1 结束时）尚未解决的**：

- **事件扫描靠公共 RPC**，`eth_getLogs` 最多 10K 块/次；生产需切 Alchemy
- **没有 indexer**，feed/links 依赖前端实时扫事件；链上吞吐高时 UI 会慢
- **Identity 备份 UX 简陋**，用户清浏览器 localStorage → 永久失去 spirit 所有权
- **反女巫**：`joinGroup` 任何地址都能调，mainnet 前应加 hCaptcha / WorldID
- **"love" 情绪已移除**（当前模型输出不包含 love，旧数据会被映射为其他类别）
- **Legacy 代码**已移到 `contracts/legacy/` 和 `src/lib/legacy/` 作标本；见各目录 README

**不是限制（设计选择）**：

- Text 公开存 IPFS metadata：anonymity 与 readability 权衡下选择公开
- DB 保留作 cache：加速 feed，但不是 trust anchor
- Link 不用 ZK：stealth 地址本身公开，ECDSA 足够

---

---

<a id="english"></a>

## English

### Introduction

Wizper is a Web3 anonymous expression platform. Users write a short piece of text, it is turned into a unique pixel wizard, and minted as a soulbound NFT. **The main wallet has no on-chain link to any spirit.** Identity is proven via a Semaphore zero-knowledge proof, gas is paid by a relayer, and each NFT is owned by a stealth address derived from the user's identity secret.

**Runs on Base Sepolia (chainId 84532).**

---

### Table of Contents

- [Why](#why)
- [Architecture](#architecture)
- [Key Flows](#key-flows)
- [Tech Stack](#tech-stack-1)
- [Smart Contract](#smart-contract)
- [Database Role](#database-role)
- [Project Structure](#project-structure-1)
- [Running Locally](#running-locally)
- [Known Limitations](#known-limitations)

---

### Why

Traditional Web3 social apps post from the user's main wallet: the wallet is forever the `ownerOf(tokenId)` answer, and anyone (block explorer, Chainalysis, wallet profilers) can join "this account said X" with "this person is Y". Stacking a single hash commitment on top (the old Wizper design) only papers over the problem.

**Wizper separates three anonymity concerns:**

1. **Membership**: users join a Semaphore anonymous group. The main wallet signs **once** proving "I am *some* member", but the chain never records *which* member corresponds to which post.
2. **Authorship**: every mint carries a fresh Semaphore ZK proof plus a random nullifier. The contract sees "some group member submitted this signal" — never *which*.
3. **Ownership**: the NFT is minted to a stealth address deterministically derived from the identity secret. Only the user can derive the private key, but the address has no on-chain trace to the main wallet.

Result: we (the operator) cannot deanonymize users — not from the backend, not from the chain.

---

### Architecture

```
+---------------------+                              +--------------------------+
|                     |   Semaphore proof + mint     |                          |
|   Next.js frontend  |   params (stealthOwner,      |                          |
|                     |   tokenURI, ...)             |                          |
|   - identity (LS)   | ---------------------------> |  Relayer (hot wallet)    |
|   - stealth derive  |                              |  /api/relay/{mint,link}  |
|   - ZK proof gen    |                              |                          |
|   - ECDSA sign      | <---- tx hash -------------- |  pays gas, no trust      |
+---------+-----------+                              +------------+-------------+
          |                                                       |
          |                                                       v
          |                                        +--------------------------+
          |                                        |  WizperAnonymous.sol     |
          |   IPFS                                 |  (Base Sepolia)          |
          |  (Pinata: SVG +                        |                          |
          |   JSON metadata                        |  Semaphore.validateProof |
          |   incl. text)                          |  mintSpirit (ERC-721)    |
          | <------------------------------------> |  joinGroup               |
          |                                        |  request/confirmLink     |
          +------- reads events: SpiritMinted,---- +                          |
                   LinkRequested/Confirmed                                    |
                                                                              
                                                   +--------------------------+
                                                   |  Semaphore (PSE-deployed)|
                                                   |  0x8A1fd199...c693D      |
                                                   +--------------------------+
```

An **optional** cache lives in Supabase Postgres (`Expression` and `Link` tables). The `owner` column now stores the stealth address instead of the main wallet. Feed queries hit the cache for speed, and a `scripts/recover-missing-mints.mjs` script can rebuild rows from on-chain events + IPFS if the cache ever drifts.

---

### Key Flows

#### 1. Join the Wizper group (`/join`, once per user)

```
Client:
  identity = new Identity()                      // random 32B secret
  localStorage["wizper_semaphore_identity_v1"] = identity.export()
  stealthAddr = privateKeyToAccount(
      keccak256("wizper-stealth-v1:" + secret)
  ).address

  // User backs up secret (export JSON or copy), then:
  await writeContract(WizperAnonymous, "joinGroup", [identity.commitment])
  // ← main wallet signs one tx. Chain only sees "some wallet joined Wizper".
```

#### 2. Anonymous mint (`/create`)

```
1. Upload text + SVG + metadata to IPFS
   → tokenURI = "ipfs://{cid}"
2. Pull MemberJoined events, rebuild Semaphore group locally
3. Generate Semaphore proof binding:
     - stealthOwner (member in Merkle tree)
     - tokenURI + expressionHash + emotion (signal)
     - scope = expressionHash (same scope = same identity cannot mint same text twice)
4. POST /api/relay/mint { proof, stealthOwner, tokenURI, ... }
5. Relayer wallet calls mintSpirit(...)
6. Contract: Semaphore.validateProof → mint NFT to stealthOwner
7. Frontend parses SpiritMinted event for tokenId, writes DB cache
```

**Main wallet signs nothing.** From the user's point of view it's just "Publishing… → Done."

#### 3. Link two spirits

Links use **stealth-key ECDSA signatures**, not ZK:

```
Initiator (owner of tokenA):
  stealthKey_A.signMessage(
    keccak256(abi.encode(LINK_REQUEST_TYPEHASH, chainId, contract, A, B))
  )
  → POST /api/relay/link { kind: 'request', fromTokenId: A, toTokenId: B, sig }

Contract requestLink(A, B, sig):
  require(ecrecover(digest) == ownerOf(A))       // stealth address is public
  links[linkId(A,B)].status = Pending

Acceptor (owner of tokenB, same flow):
  → POST /api/relay/link { kind: 'confirm', ... }

Contract confirmLink(A, B, sig):
  require(ecrecover == ownerOf(B))
  links[...].status = Confirmed
```

Smart UX: if user B sees an inbound request on their spirit detail page, the button reads **"Accept Link"** — one click completes the handshake, avoiding a wasteful reverse-direction duplicate.

---

<a id="tech-stack-1"></a>
### Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind v4 |
| Wallet | wagmi 3, viem 2, MetaMask / WalletConnect |
| Anonymous ZK | `@semaphore-protocol/identity`, `group`, `proof` (v4) |
| Contracts | Solidity 0.8.23+, OpenZeppelin v5 (ERC-721 Enumerable + URIStorage), Semaphore v4 |
| Deployment | Remix → Base Sepolia |
| Emotion detection | HuggingFace Inference Providers router<br>— English: `j-hartmann/emotion-english-distilroberta-base`<br>— Chinese: `Johnson8187/Chinese-Emotion`<br>Auto language routing by CJK char detection |
| Storage | IPFS via Pinata (SVG + ERC-721 metadata with full `text`) |
| Database | Prisma 5 + Supabase Postgres (**cache**, not source of truth) |
| Relayer | Node hot wallet (env var), pays gas |

---

### Smart Contract

Primary: **[contracts/WizperAnonymous.sol](contracts/WizperAnonymous.sol)**.

Deployed on Base Sepolia, references PSE's production Semaphore at `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`.

#### State

```solidity
ISemaphore public immutable semaphore;
uint256 public groupId;                        // fixed after initialize()
bool public immutable soulbound;               // ctor param, true in prod

// NFT
mapping(uint256 => SpiritData) public spirits;  // tokenId → hash/emotion/time
mapping(bytes32 => bool) public hashMinted;    // prevents duplicate text mint

// Link
enum LinkStatus { None, Pending, Confirmed }
mapping(bytes32 => LinkData) public links;     // keccak(from,to) → status
mapping(uint256 => bytes32[]) public linksByToken;
```

#### Functions

| Function | Caller | Effect |
|---|---|---|
| `initialize()` | owner, once | Creates a fresh Semaphore group with this contract as admin |
| `joinGroup(uint256 commitment)` | any address | Inserts identity commitment into the Merkle tree |
| `mintSpirit(proof, stealthOwner, uri, expressionHash, emotion)` | usually relayer | Verifies proof + mints ERC-721 to stealth address |
| `requestLink(from, to, sig)` | usually relayer | Checks signature is from ownerOf(from), marks Pending |
| `confirmLink(from, to, sig)` | usually relayer | Checks signature is from ownerOf(to), marks Confirmed |

#### Events

```solidity
event GroupInitialized(uint256 indexed groupId);
event MemberJoined(uint256 identityCommitment);
event SpiritMinted(uint256 indexed tokenId, address indexed stealthOwner,
                   bytes32 expressionHash, string emotion);
event LinkRequested(bytes32 indexed linkId, uint256 indexed fromTokenId,
                    uint256 indexed toTokenId);
event LinkConfirmed(bytes32 indexed linkId, uint256 indexed fromTokenId,
                    uint256 indexed toTokenId);
```

Frontend rebuilds **all** state (group membership, my spirits, link graph) from these events.

---

### Database Role

The DB is an **optional cache, not source of truth**. Everything can be reconstructed from on-chain events + IPFS.

```prisma
model Expression {
  id        String   @id         // client-generated c-{timestamp} or recovered-{tokenId}
  text      String                // full text (redundant; also in IPFS metadata)
  emotion   String                // anger | sadness | joy | fear | confusion
  minted    Boolean  @default(false)
  hidden    Boolean  @default(false)
  owner     String                // stealth address (lowercase)
  tokenId   String?               // ERC-721 id, decimal string
  tokenURI  String?
  txHash    String?
  createdAt DateTime @default(now())
  mintedAt  DateTime?
}

model Link {
  id     String @id
  fromId String
  toId   String
  status String @default("pending")   // pending | confirmed
}
```

**Note**: the `Link` table is **no longer written** by the anonymous flow. Link UI reads directly from chain events (`LinkRequested` / `LinkConfirmed`). The table is kept for migration backwards compatibility.

**Recovery**: if a mint lands on-chain but the DB write fails (e.g. 500 on POST), run [`scripts/recover-missing-mints.mjs`](scripts/recover-missing-mints.mjs) to rebuild rows from events + IPFS.

---

<a id="project-structure-1"></a>
### Project Structure

```
wizper/
├── contracts/
│   ├── WizperAnonymous.sol          # ★ main contract (Phase 1)
│   ├── WizperToken.sol              # kept: used by home-page daily reward
│   ├── ZK_POC_GUIDE.md              # Phase 0 POC deployment guide
│   └── legacy/                      # v0 artifacts, not deployed, kept for reference
│       ├── README.md
│       ├── WizperNFT.sol
│       ├── WizperZKVerifier.sol
│       └── DEPLOY_GUIDE.md
│
├── scripts/
│   ├── gen-relayer.mjs              # generate relayer private key
│   ├── recover-missing-mints.mjs    # events → DB rebuild
│   ├── dedupe-expressions.mjs       # DB dedupe (same owner+text)
│   └── debug-*.mjs                  # misc debug helpers
│
├── prisma/schema.prisma
│
├── src/
│   ├── app/
│   │   ├── page.tsx                 # home
│   │   ├── join/page.tsx            # ★ identity onboarding
│   │   ├── create/page.tsx          # anonymous mint
│   │   ├── feed/page.tsx            # public feed
│   │   ├── my/page.tsx              # owned by stealth address
│   │   ├── connections/page.tsx     # link graph + inbound badge
│   │   ├── confession/[id]/page.tsx # detail + link actions
│   │   ├── zk-poc/page.tsx          # Phase 0 POC test page (dev only)
│   │   └── api/
│   │       ├── emotion/             # HuggingFace proxy (bilingual)
│   │       ├── expressions/         # cache CRUD
│   │       ├── relay/
│   │       │   ├── mint/            # ★ anonymous mint relayer
│   │       │   └── link/            # ★ link request/confirm relayer
│   │       └── upload/              # Pinata IPFS upload
│   │
│   ├── components/
│   │   ├── confession/              # create form / wizard / card
│   │   ├── connection/              # force-directed graph + link card
│   │   ├── layout/                  # Navbar (with inbound badge)
│   │   └── ui/
│   │
│   ├── context/
│   │   └── AppContext.tsx           # ★ central state hub
│   │
│   └── lib/
│       ├── semaphore.ts             # identity + proof helpers
│       ├── stealth.ts               # stealth address derivation
│       ├── link.ts                  # link signatures + linkId
│       ├── emotions.ts              # UI palette + emotion labels
│       ├── contracts/
│       │   ├── anonymousAbi.ts
│       │   └── config.ts
│       └── legacy/                  # v0 artifacts, not imported
│           ├── README.md
│           └── zk.ts                # old hash-commitment helpers
│
├── .env.local
└── package.json
```

---

### Running Locally

#### Prerequisites

- Node 18+, pnpm
- MetaMask on Base Sepolia (chainId 84532)
- Small amount of Base Sepolia ETH on the main wallet (used only for `joinGroup`)
- Pinata JWT, HuggingFace API token, Supabase `DATABASE_URL`

#### Environment variables (`.env.local`)

```env
# Chain
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_WIZPER_ANONYMOUS_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_DEPLOY_BLOCK=40295190       # optional, narrows event scan

# Relayer hot wallet (server-side, no NEXT_PUBLIC_ prefix)
RELAYER_PRIVATE_KEY=0x...

# IPFS
PINATA_JWT=...
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud

# DB
DATABASE_URL=postgresql://...

# Emotion detection
HUGGINGFACE_API_TOKEN=hf_...
```

#### Boot sequence

```bash
pnpm install
npx prisma db push          # create/sync tables
pnpm prisma generate        # generate Prisma client

# Generate relayer wallet
node scripts/gen-relayer.mjs
# Save the address, fund it with ~0.05 Base Sepolia ETH
# Put the private key in RELAYER_PRIVATE_KEY

pnpm dev
```

#### Deploy contract (once)

1. Open Remix, paste [contracts/WizperAnonymous.sol](contracts/WizperAnonymous.sol)
2. Compiler 0.8.23+, Environment: `Injected Provider - MetaMask` (Base Sepolia)
3. Constructor args:
   - `semaphoreAddress`: `0x8A1fd199516489B0Fb7153EB5f075cDAC83c693D`
   - `_soulbound`: `true`
4. After deployment call `initialize()` once (creates the Semaphore group)
5. Set the contract address and deploy block in `.env.local`

Detailed walk-through in [contracts/ZK_POC_GUIDE.md](contracts/ZK_POC_GUIDE.md).

---

### Known Limitations

**Open issues at end of Phase 1:**

- **Event scanning uses public RPC**, which caps `eth_getLogs` at 10k blocks per call. Mainnet needs Alchemy or a self-hosted node.
- **No indexer**. Feed/links rely on client-side event scans; under high chain throughput the UI becomes slow.
- **Identity backup UX is rough.** If a user clears localStorage without exporting their secret, they permanently lose access to their spirits.
- **Anti-sybil**: `joinGroup` accepts any address with any commitment. Before mainnet, add hCaptcha / WorldID / similar.
- **The "love" emotion was removed.** The current models don't output it, so legacy data mapping it falls back to other categories.
- **Legacy code** now lives under `contracts/legacy/` and `src/lib/legacy/` as preserved specimens; see each folder's README.

**Not a limitation (design choice):**

- Text is stored publicly in IPFS metadata: chosen trade-off for readability on third-party marketplaces.
- DB retained as a cache: speeds up feed rendering, but never trusted as truth.
- Link does not use ZK: the stealth address is already public as `ownerOf`, so plain ECDSA is sufficient.

---

### Credits

- [Semaphore Protocol](https://semaphore.pse.dev/) (PSE) — anonymous group membership ZK primitive
- [OpenZeppelin Contracts v5](https://www.openzeppelin.com/contracts) — battle-tested ERC-721 base
- [Pinata](https://pinata.cloud/) — IPFS pinning
- [HuggingFace](https://huggingface.co/) — emotion classification models
- [Base](https://base.org/) — L2 with cheap gas, where everything runs
