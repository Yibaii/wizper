// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title WizperNFT
 * @notice 将匿名 Expression 巫师 Mint 为链上 NFT
 *
 * 每个 NFT 代表一个Expression:
 *   - tokenURI 指向 IPFS 上的 metadata (巫师 SVG + 情绪 + 文本 hash)
 *   - expressionHash 存储告白文本的 keccak256 哈希 (用于 ZK 验证)
 *   - emotion 存储情绪类型
 */
contract WizperNFT is ERC721, ERC721URIStorage, Ownable {

    uint256 private _nextTokenId;

    // ── Expression 数据 ─────────────────────────────────────
    struct ExpressionData {
        bytes32 expressionHash;   // keccak256(expression 文本)
        string  emotion;          // anger, sadness, joy, fear, love, confusion
        uint256 mintedAt;         // Mint 时间戳
    }

    mapping(uint256 => ExpressionData) public expressions;
    mapping(bytes32 => bool) public hashMinted;  // 防止同一 Expression 重复 Mint

    // ── 事件 ─────────────────────────────────────────
    event ExpressionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        bytes32 expressionHash,
        string emotion
    );

    constructor() ERC721("Wizper Expression", "WIZE") Ownable(msg.sender) {}

    /// @notice Mint 一个 Expression 为 NFT
    /// @param to           接收者地址
    /// @param uri          IPFS metadata URI (ipfs://Qm...)
    /// @param expressionHash     Expression 文本的 keccak256 哈希
    /// @param emotion      情绪类型字符串
    function mintExpression(
        address to,
        string  calldata uri,
        bytes32 expressionHash,
        string  calldata emotion
    ) external returns (uint256) {
        require(!hashMinted[expressionHash], "Expression already minted");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        expressions[tokenId] = ExpressionData({
            expressionHash: expressionHash,
            emotion: emotion,
            mintedAt: block.timestamp
        });
        hashMinted[expressionHash] = true;

        emit ExpressionMinted(tokenId, to, expressionHash, emotion);
        return tokenId;
    }

    /// @notice 查询 Expression 数据
    function getExpression(uint256 tokenId)
        external
        view
        returns (bytes32 expressionHash, string memory emotion, uint256 mintedAt)
    {
        ExpressionData memory data = expressions[tokenId];
        return (data.expressionHash, data.emotion, data.mintedAt);
    }

    /// @notice 当前已 Mint 的总数量
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    // ── 必要的 override ──────────────────────────────
    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
