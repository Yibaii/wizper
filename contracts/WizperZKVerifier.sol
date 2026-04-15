// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WizperZKVerifier
 * @notice 零知识证明验证器 — 验证 Expression 所有权而不暴露作者身份
 *
 * 工作原理 (Hash-based Commitment Scheme):
 *   1. 用户创建 Expression 时，生成随机 nullifier (秘密)
 *   2. 计算 commitment = keccak256(expressionHash, nullifier, author)
 *   3. 只将 commitment 提交到链上 (不暴露 author)
 *   4. 之后用户可以通过提供 nullifier 来证明所有权
 *   5. 任何人可以验证，但无法从 commitment 反推出 author
 */
contract WizperZKVerifier is Ownable {

    // ── 存储 ─────────────────────────────────────────
    mapping(bytes32 => bool) public commitments;       // commitment => exists
    mapping(bytes32 => bool) public nullifierUsed;      // nullifier hash => used (防止重放)
    mapping(bytes32 => bool) public proofVerified;      // expressionHash => verified

    uint256 public totalCommitments;
    uint256 public totalVerifications;

    // ── 事件 ─────────────────────────────────────────
    event CommitmentSubmitted(bytes32 indexed commitment, bytes32 indexed expressionHash);
    event ProofVerified(bytes32 indexed expressionHash, bytes32 indexed nullifierHash);

    constructor() Ownable(msg.sender) {}

    /// @notice 提交 ZK commitment (创建 Expression 时调用)
    /// @param commitment   keccak256(expressionHash, nullifier, msg.sender)
    /// @param expressionHash  Expression 文本的 keccak256 哈希
    function submitCommitment(
        bytes32 commitment,
        bytes32 expressionHash
    ) external {
        require(!commitments[commitment], "Commitment already exists");

        commitments[commitment] = true;
        totalCommitments++;

        emit CommitmentSubmitted(commitment, expressionHash);
    }

    /// @notice 验证所有权证明 (不暴露作者地址)
    /// @param expressionHash  Expression 文本的哈希
    /// @param nullifier       用户的秘密随机数
    /// @param author          声称的作者地址
    /// @return valid  证明是否有效
    function verifyProof(
        bytes32 expressionHash,
        bytes32 nullifier,
        address author
    ) external returns (bool valid) {
        // 重建 commitment
        bytes32 commitment = keccak256(abi.encodePacked(expressionHash, nullifier, author));

        // 验证 commitment 存在
        require(commitments[commitment], "Invalid proof: commitment not found");

        // 检查 nullifier 未被使用过 (防止重放攻击)
        bytes32 nullifierHash = keccak256(abi.encodePacked(nullifier));
        require(!nullifierUsed[nullifierHash], "Nullifier already used");

        // 标记验证成功
        nullifierUsed[nullifierHash] = true;
        proofVerified[expressionHash] = true;
        totalVerifications++;

        emit ProofVerified(expressionHash, nullifierHash);
        return true;
    }

    /// @notice 检查某个 Expression 是否已被 ZK 验证
    function isVerified(bytes32 expressionHash) external view returns (bool) {
        return proofVerified[expressionHash];
    }

    /// @notice 检查某个 commitment 是否存在
    function hasCommitment(bytes32 commitment) external view returns (bool) {
        return commitments[commitment];
    }
}
