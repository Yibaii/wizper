// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WizperToken ($WIZPER)
 * @notice Wizper 平台代币 — 用于Expression Mint、关联请求、治理投票
 *
 * 代币经济:
 *   - 总供应量: 100,000,000 WIZPER
 *   - Mint 一个 Expression NFT 消耗 5 WIZPER (burn)
 *   - 创建关联请求消耗 2 WIZPER (burn)
 *   - 每日签到奖励 6 WIZPER (owner mint)
 */
contract WizperToken is ERC20, ERC20Burnable, Ownable {

    // ── 代币经济常量 ──────────────────────────────────
    uint256 public constant MINT_COST      =  5 * 10 ** 18;  // Mint Expression NFT 消耗
    uint256 public constant LINK_COST      =  2 * 10 ** 18;  // 关联请求消耗
    uint256 public constant DAILY_REWARD   =  6 * 10 ** 18;  // 每日签到奖励
    uint256 public constant MAX_SUPPLY     = 100_000_000 * 10 ** 18;

    // ── 签到追踪 ─────────────────────────────────────
    mapping(address => uint256) public lastClaimTime;

    // ── 事件 ─────────────────────────────────────────
    event ExpressionMintPaid(address indexed user, uint256 amount);
    event LinkRequestPaid(address indexed user, uint256 amount);
    event DailyRewardClaimed(address indexed user, uint256 amount);

    constructor() ERC20("Wizper", "WIZPER") Ownable(msg.sender) {
        // 初始铸造 10% 给部署者 (团队/国库)
        _mint(msg.sender, 10_000_000 * 10 ** 18);
    }

    // ── 核心功能 ─────────────────────────────────────

    /// @notice 用户支付代币来 Mint Expression NFT (代币被销毁)
    function payForMint() external {
        require(balanceOf(msg.sender) >= MINT_COST, "Insufficient WIZPER for mint");
        _burn(msg.sender, MINT_COST);
        emit ExpressionMintPaid(msg.sender, MINT_COST);
    }

    /// @notice 用户支付代币来创建关联请求 (代币被销毁)
    function payForLink() external {
        require(balanceOf(msg.sender) >= LINK_COST, "Insufficient WIZPER for link");
        _burn(msg.sender, LINK_COST);
        emit LinkRequestPaid(msg.sender, LINK_COST);
    }

    /// @notice 每日签到领取奖励
    function claimDailyReward() external {
        require(
            block.timestamp >= lastClaimTime[msg.sender] + 1 days,
            "Already claimed today"
        );
        require(
            totalSupply() + DAILY_REWARD <= MAX_SUPPLY,
            "Max supply reached"
        );

        lastClaimTime[msg.sender] = block.timestamp;
        _mint(msg.sender, DAILY_REWARD);
        emit DailyRewardClaimed(msg.sender, DAILY_REWARD);
    }

    // ── 管理功能 ─────────────────────────────────────

    /// @notice Owner 可以空投代币给用户 (用于活动奖励)
    function airdrop(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Exceeds max supply");
        _mint(to, amount);
    }
}
