# Wizper 合约部署指南 (Remix + Sepolia)

## 前置准备

1. **安装 MetaMask 浏览器插件**: https://metamask.io
2. **切换到 Sepolia 测试网**: MetaMask → 网络 → 显示测试网络 → Sepolia
3. **领取测试 ETH**: 
   - https://sepoliafaucet.com
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - 需要少量 Sepolia ETH 支付 gas 费

---

## Step 1: 部署 WizperToken ($WIZPER)

### 1.1 打开 Remix IDE
访问 https://remix.ethereum.org

### 1.2 创建合约文件
- 在 File Explorer 中，`contracts/` 文件夹下新建 `WizperToken.sol`
- 把 `contracts/WizperToken.sol` 的内容复制粘贴进去

### 1.3 安装 OpenZeppelin
在 Remix 中，OpenZeppelin imports 会自动从 npm 解析，无需手动安装。

### 1.4 编译
- 左侧面板选择 "Solidity Compiler" (第二个图标)
- Compiler 版本选择 `0.8.34+` (推荐最新稳定版，gas 优化更好)
- 点击 "Compile WizperToken.sol"
- 确保没有报错 (warnings 可以忽略)

### 1.5 部署
- 左侧面板选择 "Deploy & Run" (第三个图标)
- Environment: 选择 **"Injected Provider - MetaMask"**
- MetaMask 弹窗确认连接 Sepolia 网络
- Contract: 选择 `WizperToken`
- 点击 **Deploy**
- MetaMask 弹窗确认交易
- 等待交易确认

### 1.6 记录合约地址
部署成功后，在 "Deployed Contracts" 下面会显示合约地址。
**复制并保存这个地址！** 后面要用。

格式类似: `0x1234...abcd`

### 1.7 验证合约 (可选)
在 Etherscan Sepolia 上验证合约源代码:
https://sepolia.etherscan.io/address/你的合约地址#code

---

## Step 2: 部署 WizperNFT

重复上面的步骤，但使用 `WizperNFT.sol` 文件。

### 部署后测试
在 Remix 的 Deployed Contracts 面板中，可以直接调用函数测试:

1. **测试 Token:**
   - `balanceOf(你的地址)` → 应该返回 10,000,000 * 10^18
   - `name()` → "Wizper"
   - `symbol()` → "WIZPER"

2. **测试 NFT:**
   - `mintExpression(你的地址, "ipfs://test", 0x1234...随意哈希, "joy")`
   - `totalMinted()` → 应该返回 1

---

## 部署后获得的信息

部署完成后，你需要记录以下信息用于前端集成:

```
NEXT_PUBLIC_WIZPER_TOKEN_ADDRESS=0x...  (WizperToken 合约地址)
NEXT_PUBLIC_WIZPER_NFT_ADDRESS=0x...    (WizperNFT 合约地址)
NEXT_PUBLIC_CHAIN_ID=11155111            (Sepolia)
```

把这些写入项目根目录的 `.env.local` 文件。
