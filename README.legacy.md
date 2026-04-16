# Wizper — Legacy Architecture (v0)

> ⚠️ **This document is archived.** It describes the original Wizper architecture
> (main-wallet mint + hash-commitment ZK + `$WIZPER` tokenomics + on-chain `love`
> emotion). The project has since migrated to a Semaphore-based anonymous mint
> flow with stealth-address NFT ownership. See [`README.md`](./README.md) for
> the current architecture.
>
> This file is kept for historical reference. Do not rely on any contract
> address, API route, or data model described here.
>
> ⚠️ **本文档已归档。** 描述的是 Wizper 初始架构（主钱包 mint + 哈希承诺 ZK +
> `$WIZPER` 代币经济 + 链上 `love` 情绪）。项目已迁移到基于 Semaphore 的匿名
> mint 流程，NFT 由隐身地址持有。最新架构见 [`README.md`](./README.md)。

> Where Emotions Become Spirits

[English](#english) | [中文](#中文)

---

<a id="中文"></a>

## 中文

### 简介

Wizper 是一个 Web3 匿名表达平台，拥有复古像素风美术风格。用户撰写匿名表达后，系统会自动将其转化为独一无二的程序化生成巫师角色。这些巫师可以在链上铸造为 NFT，身份隐私通过零知识承诺方案保护。

**部署于 Base Sepolia 测试网 | 前端托管于 Vercel**

---

### 目录

- [架构概览](#架构概览)
- [技术栈](#技术栈)
- [核心功能](#核心功能)
- [智能合约](#智能合约)
- [零知识证明系统](#零知识证明系统)
- [程序化巫师生成](#程序化巫师生成)
- [情绪检测算法](#情绪检测算法)
- [NFT 铸造流程](#nft-铸造流程)
- [IPFS 存储](#ipfs-存储)
- [代币经济](#代币经济)
- [数据架构](#数据架构)
- [项目结构](#项目结构)
- [部署与运行](#部署与运行)

---

### 架构概览

```
+------------------+       +-------------------+       +------------------------+
|                  |       |                   |       |   智能合约              |
|   Next.js 应用   |------>|   API 路由         |       |   (Base Sepolia)       |
|   (前端)         |       |   /api/expressions|       |                        |
|                  |       |   /api/upload     |       |  WizperToken (ERC-20)  |
|  - wagmi/viem    |       |   /api/links      |       |  WizperNFT   (ERC-721) |
|  - 巫师生成器     |       +--------+----------+       |  WizperZKVerifier      |
|  - ZK 库         |                |                  +-----------+------------+
|                  |                v                               ^
+--------+---------+       +-------------------+                   |
         |                 |  Supabase (PgSQL) |                   |
         |                 |  Pinata (IPFS)    |                   |
         |                 +-------------------+                   |
         |                                                         |
         +-------- MetaMask (钱包 + 交易签名) --------------------+
```

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| 动画 | Framer Motion |
| 钱包 | wagmi 3, viem 2 |
| 智能合约 | Solidity 0.8.20+, OpenZeppelin |
| 合约部署 | Remix IDE（Base Sepolia, Chain ID: 84532） |
| 数据库 | Prisma 5 + Supabase PostgreSQL |
| 存储 | IPFS（Pinata SDK） |
| ZK 隐私 | 基于哈希的承诺方案 (keccak256) |
| 前端部署 | Vercel（自动 CI/CD） |
| 字体 | Press Start 2P, Zpix |

---

### 核心功能

#### 1. 匿名表达创作
用户撰写匿名表达（最多 280 字符）。情绪检测算法自动将每条表达归类为 6 种情绪之一，并根据文本内容程序化生成独一无二的巫师角色。

#### 2. 数据持久化（数据库）
- **未铸造的表达** — 仅存储在数据库中，用户可以随时删除
- **已铸造的表达** — 上链 + IPFS + 数据库，出现在公开 Feed 中，不可删除（但可隐藏）
- 数据按钱包地址隔离，断开钱包后不显示他人数据

#### 3. NFT 铸造
表达可以铸造为 ERC-721 NFT。巫师 SVG 图像和元数据上传至 IPFS，NFT 的 `tokenURI` 指向不可变的 IPFS 内容。

#### 4. ZK 隐私保护
铸造时会在链上提交零知识承诺。这允许用户后续证明自己是某条表达的作者，而无需暴露钱包地址。

#### 5. 连接图谱
用户可以在共享相似情绪的表达之间请求"魔法链接"。确认的连接在力导向图中可视化展示，带有动态粒子效果。

#### 6. 代币经济
平台由 $WIZPER（ERC-20）驱动，铸造和链接时燃烧代币，每日签到可领取奖励。

#### 7. 我的表达
"Mine" 页面展示当前钱包拥有的所有表达（已铸造 + 未铸造），支持筛选、删除和隐藏操作。

#### 8. 每日奖励
首页提供每日签到领取 6 $WIZPER，每 24 小时限领一次。

---

### 智能合约

#### WizperToken ($WIZPER) — ERC-20

**地址：** `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce`

基于 OpenZeppelin 的 ERC-20 代币，带有燃烧机制。

```solidity
uint256 public constant MINT_COST    =  5 * 10 ** 18;  // 铸造 NFT 消耗 5 WIZPER
uint256 public constant LINK_COST    =  2 * 10 ** 18;  // 请求链接消耗 2 WIZPER
uint256 public constant DAILY_REWARD =  6 * 10 ** 18;  // 每日签到奖励 6 WIZPER
uint256 public constant MAX_SUPPLY   = 100_000_000 * 10 ** 18;
```

| 函数 | 说明 |
|------|------|
| `payForMint()` | 燃烧调用者 5 WIZPER，铸造 NFT 前调用 |
| `payForLink()` | 燃烧调用者 2 WIZPER，请求链接前调用 |
| `claimDailyReward()` | 向调用者铸造 6 WIZPER，24 小时冷却 |
| `airdrop(to, amount)` | 仅合约所有者可调用，向目标地址铸造代币 |

**初始分发：** 部署时向部署者铸造 10,000,000 WIZPER（10%）。

---

#### WizperNFT — ERC-721

**地址：** `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95`

每个 NFT 代表一条已铸造的表达。

```solidity
struct ExpressionData {
    bytes32 expressionHash;   // 表达文本的 keccak256 哈希
    string  emotion;          // anger | sadness | joy | fear | love | confusion
    uint256 mintedAt;         // 铸造时的区块时间戳
}
```

| 函数 | 说明 |
|------|------|
| `mintExpression(to, uri, expressionHash, emotion)` | 铸造新 NFT，`hashMinted` 映射防止重复铸造 |
| `getExpression(tokenId)` | 返回指定代币的表达数据 |
| `totalMinted()` | 返回已铸造 NFT 总数 |

---

#### WizperZKVerifier — 零知识验证器

**地址：** `0x128C66125fD13910948191e23f0b5a2531D161E7`

实现基于哈希的承诺方案，用于匿名作者身份证明。

| 函数 | 说明 |
|------|------|
| `submitCommitment(commitment, expressionHash)` | 铸造时在链上存储 ZK 承诺 |
| `verifyProof(expressionHash, nullifier, author)` | 通过重建承诺来验证所有权，每个 nullifier 仅能使用一次 |
| `isVerified(expressionHash)` | 检查表达是否已通过 ZK 验证 |

---

### 零知识证明系统

Wizper 使用**基于哈希的承诺方案**，允许用户在不暴露钱包地址的情况下证明自己是某条表达的作者。

#### 阶段一：承诺（铸造时）

```
输入：
  expression_text  — 原始表达文本
  author           — 用户钱包地址（私密，不存储）

过程：
  1. expressionHash  = keccak256(expression_text)
  2. nullifier       = 随机 32 字节（客户端 crypto.getRandomValues 生成）
  3. commitment      = keccak256(expressionHash || nullifier || author)

链上操作：
  4. submitCommitment(commitment, expressionHash) → 存储承诺

客户端：
  5. 将 nullifier 保存到 localStorage（用户的秘密密钥）
```

#### 阶段二：验证（证明所有权）

```
输入：
  expressionHash  — 公开数据，来自 NFT
  nullifier       — 用户的秘密，来自 localStorage
  author          — 声称的所有者地址

过程：
  1. 重建：commitment' = keccak256(expressionHash || nullifier || author)
  2. 检查：commitment' 是否存在于链上 commitments 映射中
  3. 检查：nullifier 是否已使用（防重放）
  4. 标记 nullifier 为已使用，标记表达为已验证

输出：
  valid = true → 证明 (author) 撰写了 (expressionHash)，且链上无关联
```

#### 安全属性

| 属性 | 保证 |
|------|------|
| **隐藏性** | 承诺不泄露作者信息。给定 `commitment = H(expressionHash, nullifier, author)`，观察者无法反向哈希得到 `author` |
| **绑定性** | 承诺绑定到特定的（表达，作者）对。不同作者在不知道 nullifier 的情况下无法产生相同承诺 |
| **防重放** | 每个 nullifier 只能使用一次 |
| **不可关联性** | 同一作者的多条表达使用独立的随机 nullifier，使其无法被关联 |

---

### 程序化巫师生成

每条表达确定性地生成一个独一无二的巫师角色 SVG。生成完全基于文本内容——相同文本始终产生相同巫师。

#### 哈希函数

```javascript
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
```

#### 特征选择

| 特征 | 选项 | 数量 | 选择方式 |
|------|------|------|---------|
| 长袍颜色 | 紫色、青色、深红、蓝色、金色、绿色、棕色、银色 | 8 | `(h + 0) % 8` |
| 肤色 | 5 种肤色 | 5 | `(h + 7) % 5` |
| 胡须颜色 | 白、灰、棕、深色、黑、金、红 | 7 | `(h + 13) % 7` |
| 法杖顶部 | 宝珠、水晶、火焰、星星、新月 | 5 | `(h + 19) % 5` |
| 帽子样式 | 尖帽、宽帽、兜帽、王冠 | 4 | `(h + 23) % 4` |
| 眼睛类型 | 点状、发光、高光、窄缝 | 4 | `h % 4` |
| 有胡须 | 是/否 | 2 | `h % 3 !== 0`（67%） |
| 有法杖 | 是/否 | 2 | `h % 4 !== 0`（75%） |
| 有猫咪 | 是/否 | 2 | `h % 7 === 0`（14%） |

**总组合数：** `8 x 5 x 7 x 5 x 4 x 4 x 2 x 2 x 2 = 179,200` 个独特巫师

---

### 情绪检测算法

表达通过关键词匹配分类为 6 种情绪：

| 情绪 | 关键词 | 图标 |
|------|--------|------|
| 愤怒 | angry, furious, rage, hate, scream, mad, frustrated | 🔥 |
| 悲伤 | sad, cry, tears, lonely, miss, depressed, grief, alone | 💧 |
| 喜悦 | happy, smile, laugh, amazing, wonderful, joy, glad, bright, courage | ✨ |
| 恐惧 | afraid, scared, fear, anxiety, worry, nervous, dread, panic | 👁️ |
| 爱 | love, heart, crush, letter, kiss, adore, romance, dear | 💜 |
| 困惑 | confused, lost, why, spinning, understand, unsure, uncertain | 🌀 |

无关键词匹配时，默认情绪为**困惑**。

---

### NFT 铸造流程

完整铸造过程包含 5 个步骤：

```
用户点击 "Mint NFT"
        |
        v
[1] 上传至 IPFS（链下）
    - 序列化巫师 SVG → POST /api/upload → Pinata
    - 上传 SVG 图片 → 获取 imageCID
    - 构建 ERC-721 元数据 JSON
    - 上传元数据 → tokenURI = "ipfs://{metadataCID}"
        |
        v
[2] 提交 ZK 承诺（链上交易 #1）
    - 生成随机 nullifier
    - 计算 commitment = keccak256(expressionHash, nullifier, author)
    - 调用 WizperZKVerifier.submitCommitment()
    - 保存 nullifier 到 localStorage
        |
        v
[3] 支付 WIZPER（链上交易 #2）
    - 调用 WizperToken.payForMint()
    - 燃烧用户余额中的 5 WIZPER
        |
        v
[4] 铸造 NFT（链上交易 #3）
    - 调用 WizperNFT.mintExpression()
    - NFT 铸造到用户地址
        |
        v
[5] 更新数据库
    - PATCH /api/expressions → 标记 minted=true
    - 刷新 Feed 和 Mine 页面
        |
        v
    铸造完成
```

---

### 数据架构

Wizper 使用 Prisma ORM + Supabase PostgreSQL 进行数据持久化。

#### 数据模型

```prisma
model Expression {
  id        String    @id
  text      String
  emotion   String                    // anger | sadness | joy | fear | love | confusion
  minted    Boolean   @default(false)
  hidden    Boolean   @default(false)
  owner     String                    // 钱包地址（小写）
  tokenURI  String?                   // IPFS URI（铸造后设置）
  txHash    String?                   // 铸造交易哈希
  createdAt DateTime  @default(now())
  mintedAt  DateTime?
}

model Link {
  id     String @id
  fromId String
  toId   String
  status String @default("pending")   // pending | confirmed
}
```

#### API 路由

| 路由 | 方法 | 说明 |
|------|------|------|
| `/api/expressions` | GET | 获取公开 Feed（已铸造 + 未隐藏） |
| `/api/expressions` | POST | 创建新表达（保存到数据库） |
| `/api/expressions` | PATCH | 更新表达（铸造、隐藏） |
| `/api/expressions` | DELETE | 删除未铸造的表达（仅限所有者） |
| `/api/expressions/mine` | GET | 获取当前钱包的所有表达 |
| `/api/links` | GET/POST/PATCH | 链接管理 |
| `/api/upload` | POST | IPFS 上传（SVG + 元数据） |

#### 数据流规则

| 状态 | 存储 | 可见性 | 可删除 | 可隐藏 |
|------|------|--------|--------|--------|
| 未铸造 | 仅数据库 | 仅 Mine 页面 | 是 | 否 |
| 已铸造 | 数据库 + 链上 + IPFS | Feed + Mine | 否 | 是 |
| 已隐藏 | 数据库 + 链上 + IPFS | 仅 Mine | 否 | — |

---

### 代币经济

#### $WIZPER 代币概览

| 参数 | 值 |
|------|------|
| 名称 | Wizper |
| 符号 | WIZPER |
| 标准 | ERC-20 |
| 最大供应量 | 100,000,000 WIZPER |
| 初始铸造 | 10,000,000（10% 给部署者） |
| 精度 | 18 |

#### 燃烧机制（通缩）

| 行为 | 消耗 | 机制 |
|------|------|------|
| 铸造 NFT | 5 WIZPER | 通过 `payForMint()` 燃烧 |
| 请求链接 | 2 WIZPER | 通过 `payForLink()` 燃烧 |

#### 奖励机制（通胀）

| 行为 | 奖励 | 约束 |
|------|------|------|
| 每日签到 | 6 WIZPER | 每地址 24 小时冷却，受 MAX_SUPPLY 限制 |
| 空投 | 可变 | 仅所有者，受 MAX_SUPPLY 限制 |

```
有效供应量 = 初始铸造 + 每日奖励 + 空投 - 铸造燃烧 - 链接燃烧
```

---

### 项目结构

```
wizper/
├── contracts/                    # Solidity 智能合约
│   ├── WizperToken.sol           # $WIZPER ERC-20 代币
│   ├── WizperNFT.sol             # 表达 NFT (ERC-721)
│   └── WizperZKVerifier.sol      # ZK 承诺验证器
│
├── prisma/
│   └── schema.prisma             # 数据库模型定义
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # 首页（含每日签到）
│   │   ├── create/page.tsx       # 表达创作
│   │   ├── feed/page.tsx         # 表达画廊（公开 Feed）
│   │   ├── my/page.tsx           # 我的表达（管理页）
│   │   ├── connections/page.tsx  # 连接图谱可视化
│   │   ├── confession/[id]/      # 表达详情 + 铸造
│   │   └── api/                  # API 路由
│   │       ├── expressions/      # 表达 CRUD
│   │       ├── links/            # 链接管理
│   │       └── upload/           # IPFS 上传
│   │
│   ├── components/               # React 组件
│   │   ├── confession/           # 创作表单、巫师角色、卡片
│   │   ├── connection/           # 连接图谱、链接卡片
│   │   ├── layout/               # 导航栏、像素风景、粒子背景
│   │   └── ui/                   # 按钮、徽章、面板等 UI 组件
│   │
│   ├── context/
│   │   ├── AppContext.tsx         # 应用状态 + 合约交互
│   │   └── ThemeContext.tsx       # 日/夜主题
│   │
│   └── lib/
│       ├── db.ts                 # Prisma 客户端
│       ├── zk.ts                 # ZK 承诺工具
│       ├── pinata.ts             # Pinata IPFS 客户端
│       ├── wagmi.ts              # wagmi 配置
│       ├── emotions.ts           # 情绪检测 + 调色板
│       └── contracts/            # 合约 ABI + 地址配置
│
├── .env.local                    # 环境变量（不提交）
└── package.json
```

---

### 部署与运行

#### 前置要求

- Node.js 18+
- pnpm
- MetaMask 浏览器扩展
- Base Sepolia 测试网 ETH（[水龙头](https://www.alchemy.com/faucets/base-sepolia)）

#### 1. 安装依赖

```bash
pnpm install
```

#### 2. 部署智能合约

打开 [Remix IDE](https://remix.ethereum.org)，将每个合约部署到 Base Sepolia：

1. **WizperToken.sol** — Solidity 0.8.20+ 编译，通过 MetaMask 部署
2. **WizperNFT.sol** — 同上
3. **WizperZKVerifier.sol** — 同上

#### 3. 配置环境变量

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_WIZPER_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_NFT_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_ZK_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
DATABASE_URL=postgresql://...  # Supabase 连接字符串
```

#### 4. 初始化数据库

```bash
npx prisma db push
```

#### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

#### 6. Vercel 部署

1. Push 代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 添加所有环境变量
4. 部署完成后，每次 push 到 main 自动重新部署

---

### 已部署合约（Base Sepolia）

| 合约 | 地址 | 浏览器 |
|------|------|--------|
| WizperToken | `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce` | [查看](https://sepolia.basescan.org/address/0x4b86023466B8098aAE12D399543e35B42E0ab2Ce) |
| WizperNFT | `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95` | [查看](https://sepolia.basescan.org/address/0xE917Ba47a22c15840eAEC0a644330F76C2edaD95) |
| WizperZKVerifier | `0x128C66125fD13910948191e23j0b5a2531D161E7` | [查看](https://sepolia.basescan.org/address/0x128C66125fD13910948191e23f0b5a2531D161E7) |

---

---

<a id="english"></a>

## English

### Introduction

Wizper is a Web3 anonymous expression platform with a retro pixel-art aesthetic. Users write anonymous expressions that are automatically transformed into unique procedurally-generated wizard characters. These wizards can be minted as NFTs on-chain, with identity privacy protected by a Zero-Knowledge commitment scheme.

**Live on Base Sepolia Testnet | Frontend hosted on Vercel**

---

### Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Core Features](#core-features)
- [Smart Contracts](#smart-contracts-1)
- [Zero-Knowledge Proof System](#zero-knowledge-proof-system)
- [Procedural Wizard Generation](#procedural-wizard-generation)
- [Emotion Detection Algorithm](#emotion-detection-algorithm)
- [NFT Minting Flow](#nft-minting-flow)
- [IPFS Storage](#ipfs-storage)
- [Token Economics](#token-economics)
- [Data Architecture](#data-architecture)
- [Project Structure](#project-structure-1)
- [Setup & Deployment](#setup--deployment)

---

### Architecture Overview

```
+------------------+       +-------------------+       +------------------------+
|                  |       |                   |       |   Smart Contracts      |
|   Next.js App    |------>|   API Routes      |       |   (Base Sepolia)       |
|   (Frontend)     |       |   /api/expressions|       |                        |
|                  |       |   /api/upload     |       |  WizperToken (ERC-20)  |
|  - wagmi/viem    |       |   /api/links      |       |  WizperNFT   (ERC-721) |
|  - WizardGen     |       +--------+----------+       |  WizperZKVerifier      |
|  - ZK lib        |                |                  +-----------+------------+
|                  |                v                               ^
+--------+---------+       +-------------------+                   |
         |                 |  Supabase (PgSQL) |                   |
         |                 |  Pinata (IPFS)    |                   |
         |                 +-------------------+                   |
         |                                                         |
         +-------- MetaMask (wallet + tx signing) ----------------+
```

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| Animations | Framer Motion |
| Wallet | wagmi 3, viem 2 |
| Smart Contracts | Solidity 0.8.20+, OpenZeppelin |
| Deployment | Remix IDE on Base Sepolia (Chain ID: 84532) |
| Database | Prisma 5 + Supabase PostgreSQL |
| Storage | IPFS via Pinata SDK |
| ZK Privacy | Hash-based Commitment Scheme (keccak256) |
| Frontend Hosting | Vercel (automatic CI/CD) |
| Fonts | Press Start 2P, Zpix |

---

### Core Features

#### 1. Anonymous Expression Creation
Users write anonymous expressions (up to 280 characters). An emotion detection algorithm automatically categorizes each expression into one of 6 emotions, and a unique wizard character is procedurally generated from the text.

#### 2. Data Persistence (Database)
- **Un-minted expressions** — stored in database only, user can delete anytime
- **Minted expressions** — on-chain + IPFS + database, visible in public Feed, cannot be deleted (but can be hidden)
- Data is isolated by wallet address; disconnecting wallet hides other users' data

#### 3. NFT Minting
Expressions can be minted as ERC-721 NFTs. The wizard SVG image and metadata are uploaded to IPFS, and the NFT's `tokenURI` points to the immutable IPFS content.

#### 4. ZK Privacy Protection
When minting, a zero-knowledge commitment is submitted on-chain. This allows users to later prove they authored an expression without revealing their wallet address.

#### 5. Connection Graph
Users can request "magical links" between expressions that share similar emotions. Confirmed connections are visualized in a force-directed graph with animated particles.

#### 6. Token Economy
The platform is powered by $WIZPER (ERC-20), with burn mechanics for minting and linking, and daily sign-in rewards.

#### 7. My Expressions
The "Mine" page shows all expressions owned by the connected wallet (minted + un-minted), with filter, delete, and hide actions.

#### 8. Daily Reward
The home page offers a daily check-in to claim 6 $WIZPER, limited to once every 24 hours.

---

### Smart Contracts

#### WizperToken ($WIZPER) — ERC-20

**Address:** `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce`

An ERC-20 token with burn mechanics, built on OpenZeppelin's `ERC20`, `ERC20Burnable`, and `Ownable`.

```solidity
uint256 public constant MINT_COST    =  5 * 10 ** 18;  // 5 WIZPER to mint NFT
uint256 public constant LINK_COST    =  2 * 10 ** 18;  // 2 WIZPER to request link
uint256 public constant DAILY_REWARD =  6 * 10 ** 18;  // 6 WIZPER daily sign-in
uint256 public constant MAX_SUPPLY   = 100_000_000 * 10 ** 18;
```

| Function | Description |
|----------|-------------|
| `payForMint()` | Burns 5 WIZPER from caller. Called before NFT minting. |
| `payForLink()` | Burns 2 WIZPER from caller. Called before link request. |
| `claimDailyReward()` | Mints 6 WIZPER to caller. 24-hour cooldown enforced via `lastClaimTime` mapping. |
| `airdrop(to, amount)` | Owner-only. Mints tokens to a target address (capped by `MAX_SUPPLY`). |

**Initial Distribution:** 10,000,000 WIZPER (10%) minted to deployer at construction.

---

#### WizperNFT — ERC-721

**Address:** `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95`

An ERC-721 NFT contract where each token represents a minted expression.

```solidity
struct ExpressionData {
    bytes32 expressionHash;   // keccak256 of the expression text
    string  emotion;          // anger | sadness | joy | fear | love | confusion
    uint256 mintedAt;         // block.timestamp at mint time
}
```

| Function | Description |
|----------|-------------|
| `mintExpression(to, uri, expressionHash, emotion)` | Mints a new NFT. `hashMinted` mapping prevents duplicate mints. |
| `getExpression(tokenId)` | Returns the expression data for a given token. |
| `totalMinted()` | Returns the total number of minted NFTs. |

---

#### WizperZKVerifier — Zero-Knowledge Verifier

**Address:** `0x128C66125fD13910948191e23f0b5a2531D161E7`

Implements a hash-based commitment scheme for anonymous authorship proof.

| Function | Description |
|----------|-------------|
| `submitCommitment(commitment, expressionHash)` | Stores a ZK commitment on-chain during minting. |
| `verifyProof(expressionHash, nullifier, author)` | Verifies ownership by reconstructing the commitment. Single-use per nullifier. |
| `isVerified(expressionHash)` | Checks if an expression has been ZK-verified. |

---

### Zero-Knowledge Proof System

Wizper uses a **hash-based commitment scheme** to allow users to prove they authored an expression without revealing their wallet address.

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

#### Security Properties

| Property | Guarantee |
|----------|-----------|
| **Hiding** | The commitment reveals nothing about the author. Given `commitment = H(expressionHash, nullifier, author)`, an observer cannot reverse the hash to find `author`. |
| **Binding** | The commitment is bound to a specific (expression, author) pair. A different author cannot produce the same commitment without knowing the nullifier. |
| **Replay Protection** | Each nullifier can only be used once. `nullifierUsed[H(nullifier)]` prevents reuse. |
| **Non-correlation** | Multiple expressions by the same author have independent random nullifiers, making them unlinkable. |

#### Formulas

```
expressionHash = keccak256(bytes(expression_text))

nullifier = crypto.getRandomValues(new Uint8Array(32))

commitment = keccak256(abi.encodePacked(
    bytes32 expressionHash,
    bytes32 nullifier,
    address author
))
```

---

### Procedural Wizard Generation

Each expression deterministically generates a unique wizard character as an SVG. The generation is purely based on the text content — the same text always produces the same wizard.

#### Hash Function

```javascript
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
```

#### Trait Selection

| Trait | Options | Count | Selection |
|-------|---------|-------|-----------|
| Robe Color | purple, teal, crimson, blue, gold, green, brown, silver | 8 | `(h + 0) % 8` |
| Skin Color | 5 skin tones | 5 | `(h + 7) % 5` |
| Beard Color | white, grey, brown, dark, black, gold, red | 7 | `(h + 13) % 7` |
| Staff Top | orb, crystal, flame, star, crescent | 5 | `(h + 19) % 5` |
| Hat Style | pointed, wide, hooded, crown | 4 | `(h + 23) % 4` |
| Eye Type | dot, glowing, highlight, narrow | 4 | `h % 4` |
| Has Beard | yes/no | 2 | `h % 3 !== 0` (67%) |
| Has Staff | yes/no | 2 | `h % 4 !== 0` (75%) |
| Has Cat | yes/no | 2 | `h % 7 === 0` (14%) |

**Total Combinations:** `8 x 5 x 7 x 5 x 4 x 4 x 2 x 2 x 2 = 179,200 unique wizards`

---

### Emotion Detection Algorithm

Expressions are classified into 6 emotions using keyword matching:

| Emotion | Keywords | Icon |
|---------|----------|------|
| Anger | angry, furious, rage, hate, scream, mad, frustrated | 🔥 |
| Sadness | sad, cry, tears, lonely, miss, depressed, grief, alone | 💧 |
| Joy | happy, smile, laugh, amazing, wonderful, joy, glad, bright, courage | ✨ |
| Fear | afraid, scared, fear, anxiety, worry, nervous, dread, panic | 👁️ |
| Love | love, heart, crush, letter, kiss, adore, romance, dear | 💜 |
| Confusion | confused, lost, why, spinning, understand, unsure, uncertain | 🌀 |

If no keywords match, the default emotion is **confusion**.

---

### NFT Minting Flow

The complete minting process involves 5 steps:

```
User clicks "Mint NFT"
        |
        v
[1] Upload to IPFS (off-chain)
    - Serialize wizard SVG → POST /api/upload → Pinata
    - Upload SVG image → get imageCID
    - Build ERC-721 metadata JSON
    - Upload metadata → tokenURI = "ipfs://{metadataCID}"
        |
        v
[2] Submit ZK Commitment (on-chain tx #1)
    - Generate random nullifier
    - Compute commitment = keccak256(expressionHash, nullifier, author)
    - Call WizperZKVerifier.submitCommitment()
    - Save nullifier to localStorage
        |
        v
[3] Pay with WIZPER (on-chain tx #2)
    - Call WizperToken.payForMint()
    - Burns 5 WIZPER from user's balance
        |
        v
[4] Mint NFT (on-chain tx #3)
    - Call WizperNFT.mintExpression()
    - NFT minted to user's address
        |
        v
[5] Update Database
    - PATCH /api/expressions → mark minted=true
    - Refresh Feed and Mine pages
        |
        v
    Mint Complete
```

---

### IPFS Storage

NFT assets are stored on IPFS via [Pinata](https://www.pinata.cloud/) for permanent, decentralized storage.

#### NFT Metadata Format (ERC-721 Standard)

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

### Token Economics

#### $WIZPER Token Overview

| Parameter | Value |
|-----------|-------|
| Name | Wizper |
| Symbol | WIZPER |
| Standard | ERC-20 |
| Max Supply | 100,000,000 WIZPER |
| Initial Mint | 10,000,000 (10% to deployer) |
| Decimals | 18 |

#### Burn Mechanics (Deflationary)

| Action | Cost | Mechanism |
|--------|------|-----------|
| Mint Expression NFT | 5 WIZPER | Burned via `payForMint()` |
| Request Link | 2 WIZPER | Burned via `payForLink()` |

#### Reward Mechanics (Inflationary)

| Action | Reward | Constraint |
|--------|--------|-----------|
| Daily Sign-in | 6 WIZPER | 24-hour cooldown per address, capped by MAX_SUPPLY |
| Airdrop | Variable | Owner-only, capped by MAX_SUPPLY |

```
Effective Supply = Initial Mint + Daily Rewards + Airdrops - Mint Burns - Link Burns
```

---

### Data Architecture

Wizper uses Prisma ORM + Supabase PostgreSQL for data persistence.

#### Data Models

```prisma
model Expression {
  id        String    @id
  text      String
  emotion   String                    // anger | sadness | joy | fear | love | confusion
  minted    Boolean   @default(false)
  hidden    Boolean   @default(false)
  owner     String                    // wallet address (lowercase)
  tokenURI  String?                   // IPFS URI (set after mint)
  txHash    String?                   // mint transaction hash
  createdAt DateTime  @default(now())
  mintedAt  DateTime?
}

model Link {
  id     String @id
  fromId String
  toId   String
  status String @default("pending")   // pending | confirmed
}
```

#### API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/expressions` | GET | Public Feed (minted + not hidden) |
| `/api/expressions` | POST | Create new expression (saved to DB) |
| `/api/expressions` | PATCH | Update expression (mint, hide) |
| `/api/expressions` | DELETE | Delete un-minted expression (owner only) |
| `/api/expressions/mine` | GET | Get all expressions for a wallet |
| `/api/links` | GET/POST/PATCH | Link management |
| `/api/upload` | POST | IPFS upload (SVG + metadata) |

#### Data Flow Rules

| State | Storage | Visibility | Deletable | Hideable |
|-------|---------|-----------|-----------|----------|
| Un-minted | Database only | Mine page only | Yes | No |
| Minted | Database + On-chain + IPFS | Feed + Mine | No | Yes |
| Hidden | Database + On-chain + IPFS | Mine only | No | — |

---

### Project Structure

```
wizper/
├── contracts/                    # Solidity smart contracts
│   ├── WizperToken.sol           # $WIZPER ERC-20 token
│   ├── WizperNFT.sol             # Expression NFT (ERC-721)
│   └── WizperZKVerifier.sol      # ZK commitment verifier
│
├── prisma/
│   └── schema.prisma             # Database model definitions
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Home page (with daily reward)
│   │   ├── create/page.tsx       # Expression creation
│   │   ├── feed/page.tsx         # Expression gallery (public Feed)
│   │   ├── my/page.tsx           # My Expressions (management)
│   │   ├── connections/page.tsx  # Connection graph visualization
│   │   ├── confession/[id]/      # Expression detail + mint
│   │   └── api/                  # API routes
│   │       ├── expressions/      # Expression CRUD
│   │       ├── links/            # Link management
│   │       └── upload/           # IPFS upload
│   │
│   ├── components/               # React components
│   │   ├── confession/           # Create form, wizard character, cards
│   │   ├── connection/           # Connection graph, link cards
│   │   ├── layout/               # Navbar, pixel landscape, particles
│   │   └── ui/                   # Buttons, badges, panels, etc.
│   │
│   ├── context/
│   │   ├── AppContext.tsx         # App state + contract interactions
│   │   └── ThemeContext.tsx       # Day/night theme
│   │
│   └── lib/
│       ├── db.ts                 # Prisma client
│       ├── zk.ts                 # ZK commitment utilities
│       ├── pinata.ts             # Pinata IPFS client
│       ├── wagmi.ts              # wagmi configuration
│       ├── emotions.ts           # Emotion detection + palettes
│       └── contracts/            # Contract ABIs + address config
│
├── .env.local                    # Environment variables (not committed)
└── package.json
```

---

### Setup & Deployment

#### Prerequisites

- Node.js 18+
- pnpm
- MetaMask browser extension
- Base Sepolia testnet ETH ([faucet](https://www.alchemy.com/faucets/base-sepolia))

#### 1. Install Dependencies

```bash
pnpm install
```

#### 2. Deploy Smart Contracts

Open [Remix IDE](https://remix.ethereum.org) and deploy each contract to Base Sepolia:

1. **WizperToken.sol** — Compile with Solidity 0.8.20+, deploy via MetaMask
2. **WizperNFT.sol** — Same process
3. **WizperZKVerifier.sol** — Same process

#### 3. Configure Environment

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_WIZPER_TOKEN_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_NFT_ADDRESS=0x...
NEXT_PUBLIC_WIZPER_ZK_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=84532
PINATA_JWT=your_pinata_jwt
NEXT_PUBLIC_PINATA_GATEWAY=your-gateway.mypinata.cloud
DATABASE_URL=postgresql://...  # Supabase connection string
```

#### 4. Initialize Database

```bash
npx prisma db push
```

#### 5. Run Development Server

```bash
pnpm dev
```

Open http://localhost:3000

#### 6. Deploy to Vercel

1. Push code to GitHub
2. Import repository on [Vercel](https://vercel.com)
3. Add all environment variables
4. Once deployed, every push to main triggers automatic redeployment

---

### Deployed Contracts (Base Sepolia)

| Contract | Address | Explorer |
|----------|---------|----------|
| WizperToken | `0x4b86023466B8098aAE12D399543e35B42E0ab2Ce` | [View](https://sepolia.basescan.org/address/0x4b86023466B8098aAE12D399543e35B42E0ab2Ce) |
| WizperNFT | `0xE917Ba47a22c15840eAEC0a644330F76C2edaD95` | [View](https://sepolia.basescan.org/address/0xE917Ba47a22c15840eAEC0a644330F76C2edaD95) |
| WizperZKVerifier | `0x128C66125fD13910948191e23f0b5a2531D161E7` | [View](https://sepolia.basescan.org/address/0x128C66125fD13910948191e23f0b5a2531D161E7) |
