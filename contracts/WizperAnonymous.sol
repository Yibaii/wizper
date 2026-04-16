// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@semaphore-protocol/contracts/interfaces/ISemaphore.sol";

/**
 * @title WizperAnonymous
 * @notice Anonymous Wizper Spirit NFTs, minted via Semaphore zero-knowledge proofs.
 *
 * Flow:
 *   1. User creates a Semaphore identity locally (off-chain).
 *   2. User calls joinGroup(commitment) once — this commits them as an
 *      anonymous group member. The tx itself is public, so the user's main
 *      wallet is publicly known to be "some member of the Wizper group",
 *      but not which post belongs to them.
 *   3. To mint, user generates a Semaphore proof client-side binding a
 *      stealth address, tokenURI, text hash and emotion. The proof is sent
 *      to a relayer which calls mintSpirit on their behalf. The NFT is
 *      minted to the stealth address — an Ethereum account only the user's
 *      identity secret can reproduce, with no on-chain link to their wallet.
 *   4. Optional: the contract can be deployed in soulbound mode, which
 *      forbids NFT transfers after mint.
 *
 * Design notes:
 *   - `scope` = expressionHash, so the same identity cannot mint the same
 *     text twice (nullifier collision in Semaphore).
 *   - `message` binds the proof to the specific mint parameters. A relayer
 *     cannot substitute a different tokenURI or stealth address.
 */
contract WizperAnonymous is ERC721, ERC721URIStorage, ERC721Enumerable, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ── Semaphore integration ─────────────────────────────────
    ISemaphore public immutable semaphore;
    uint256 public groupId;
    bool public initialized;

    // ── NFT state ────────────────────────────────────────────
    uint256 private _nextTokenId;
    bool public immutable soulbound;

    struct SpiritData {
        bytes32 expressionHash;
        string  emotion;
        uint256 mintedAt;
    }
    mapping(uint256 => SpiritData) public spirits;
    mapping(bytes32 => bool) public hashMinted;

    // ── Link state ───────────────────────────────────────────
    // A Link connects two Spirits. Initiated by the `from` token's stealth
    // owner (by signing with the stealth private key derived from their
    // Semaphore identity). Becomes Confirmed when the `to` token's stealth
    // owner signs a matching confirmation. Links are directional in the
    // data model but semantically undirected ("you're not alone").
    enum LinkStatus { None, Pending, Confirmed }

    struct LinkData {
        uint256 fromTokenId;
        uint256 toTokenId;
        LinkStatus status;
        uint64 requestedAt;
        uint64 confirmedAt;
    }

    // Deterministic link id: keccak256(abi.encode(from, to)). Order matters.
    mapping(bytes32 => LinkData) public links;
    // Per-token list of link ids involving the token (either side).
    mapping(uint256 => bytes32[]) public linksByToken;

    // EIP-191-style signed-message type hashes.
    bytes32 public constant LINK_REQUEST_TYPEHASH = keccak256("Wizper.LinkRequest");
    bytes32 public constant LINK_CONFIRM_TYPEHASH = keccak256("Wizper.LinkConfirm");

    // ── Events ────────────────────────────────────────────────
    event GroupInitialized(uint256 indexed groupId);
    event MemberJoined(uint256 identityCommitment);
    event SpiritMinted(
        uint256 indexed tokenId,
        address indexed stealthOwner,
        bytes32 expressionHash,
        string emotion
    );
    event LinkRequested(bytes32 indexed linkId, uint256 indexed fromTokenId, uint256 indexed toTokenId);
    event LinkConfirmed(bytes32 indexed linkId, uint256 indexed fromTokenId, uint256 indexed toTokenId);

    // ── Errors ────────────────────────────────────────────────
    error AlreadyMinted();
    error MessageMismatch();
    error ScopeMismatch();
    error NotInitialized();
    error AlreadyInitialized();
    error Soulbound();
    error LinkExists();
    error LinkNotPending();
    error SelfLink();
    error BadSignature();
    error TokenNotFound();

    constructor(address semaphoreAddress, bool _soulbound)
        ERC721("Wizper Spirit", "SPIRIT")
        Ownable(msg.sender)
    {
        semaphore = ISemaphore(semaphoreAddress);
        soulbound = _soulbound;
    }

    /**
     * @notice One-time initialization: create a Semaphore group with this
     *         contract as the admin. Call after deployment.
     */
    function initialize() external onlyOwner {
        if (initialized) revert AlreadyInitialized();
        groupId = semaphore.createGroup(address(this));
        initialized = true;
        emit GroupInitialized(groupId);
    }

    // ── Anonymous membership ──────────────────────────────────

    /**
     * @notice Join the Wizper anonymous group. The caller's main wallet is
     *         publicly associated with being "some" group member, but NOT
     *         with any specific spirit.
     * @param identityCommitment Poseidon hash of the user's Semaphore public key.
     */
    function joinGroup(uint256 identityCommitment) external {
        if (!initialized) revert NotInitialized();
        semaphore.addMember(groupId, identityCommitment);
        emit MemberJoined(identityCommitment);
    }

    // ── Anonymous mint ────────────────────────────────────────

    /**
     * @notice Mint a Spirit NFT anonymously. Called by anyone (typically a
     *         relayer). The caller does not need to be the group member;
     *         the Semaphore proof attests membership without revealing which.
     * @param proof         Semaphore proof; `scope` and `message` must bind
     *                      to the arguments below.
     * @param stealthOwner  Address that will own the NFT. Only the user's
     *                      identity secret can produce the matching private
     *                      key, so only the user can transfer later (if
     *                      transfers are enabled).
     * @param uri           IPFS tokenURI (points to metadata JSON with SVG).
     * @param expressionHash keccak256 of the original expression text.
     * @param emotion       Short emotion label (anger/joy/etc).
     */
    function mintSpirit(
        ISemaphore.SemaphoreProof calldata proof,
        address stealthOwner,
        string calldata uri,
        bytes32 expressionHash,
        string calldata emotion
    ) external returns (uint256 tokenId) {
        if (!initialized) revert NotInitialized();
        if (hashMinted[expressionHash]) revert AlreadyMinted();

        // Bind the proof to the specific mint parameters.
        // Semaphore's proof struct stores message/scope as the RAW values the
        // client passed in; Semaphore.validateProof() applies the field-reducing
        // hash internally when feeding the Groth16 verifier. So we compare raw
        // to raw here — no extra hash wrap.
        uint256 rawMsg = uint256(keccak256(abi.encode(
            stealthOwner, uri, expressionHash, emotion
        )));
        if (proof.message != rawMsg) revert MessageMismatch();

        // Scope = expressionHash → same user cannot mint same text twice
        // (Semaphore detects nullifier reuse within a scope).
        uint256 rawScope = uint256(expressionHash);
        if (proof.scope != rawScope) revert ScopeMismatch();

        // Semaphore validates: group membership proof, nullifier unused-in-scope,
        // Groth16 soundness. Reverts on failure and records the nullifier.
        semaphore.validateProof(groupId, proof);

        // Mint the NFT.
        unchecked { tokenId = ++_nextTokenId; }
        _safeMint(stealthOwner, tokenId);
        _setTokenURI(tokenId, uri);

        spirits[tokenId] = SpiritData({
            expressionHash: expressionHash,
            emotion: emotion,
            mintedAt: block.timestamp
        });
        hashMinted[expressionHash] = true;

        emit SpiritMinted(tokenId, stealthOwner, expressionHash, emotion);
    }

    // ── Link flow ────────────────────────────────────────────

    /**
     * @notice Compute the deterministic link id for an ordered pair of tokens.
     *         Callers on both client and contract sides must agree on this.
     */
    function linkId(uint256 fromTokenId, uint256 toTokenId) public pure returns (bytes32) {
        return keccak256(abi.encode(fromTokenId, toTokenId));
    }

    /**
     * @notice Request a link from `fromTokenId` to `toTokenId`. Must be
     *         called by (or relayed on behalf of) the stealth owner of
     *         `fromTokenId`, proven by a signature over the standardised
     *         link-request message.
     * @param signature EIP-191 personal_sign signature by ownerOf(fromTokenId)
     *                  over `eth_sign_hash(keccak256(abi.encode(
     *                      LINK_REQUEST_TYPEHASH, chainid, this, from, to)))`.
     */
    function requestLink(
        uint256 fromTokenId,
        uint256 toTokenId,
        bytes calldata signature
    ) external returns (bytes32 id) {
        if (fromTokenId == toTokenId) revert SelfLink();
        if (_ownerOf(fromTokenId) == address(0) || _ownerOf(toTokenId) == address(0)) revert TokenNotFound();

        id = linkId(fromTokenId, toTokenId);
        if (links[id].status != LinkStatus.None) revert LinkExists();

        bytes32 digest = keccak256(abi.encode(
            LINK_REQUEST_TYPEHASH,
            block.chainid,
            address(this),
            fromTokenId,
            toTokenId
        )).toEthSignedMessageHash();

        address signer = digest.recover(signature);
        if (signer != ownerOf(fromTokenId)) revert BadSignature();

        links[id] = LinkData({
            fromTokenId: fromTokenId,
            toTokenId: toTokenId,
            status: LinkStatus.Pending,
            requestedAt: uint64(block.timestamp),
            confirmedAt: 0
        });
        linksByToken[fromTokenId].push(id);
        linksByToken[toTokenId].push(id);

        emit LinkRequested(id, fromTokenId, toTokenId);
    }

    /**
     * @notice Confirm a pending link. Must be signed by the stealth owner
     *         of `toTokenId`.
     */
    function confirmLink(
        uint256 fromTokenId,
        uint256 toTokenId,
        bytes calldata signature
    ) external {
        bytes32 id = linkId(fromTokenId, toTokenId);
        LinkData storage ld = links[id];
        if (ld.status != LinkStatus.Pending) revert LinkNotPending();

        bytes32 digest = keccak256(abi.encode(
            LINK_CONFIRM_TYPEHASH,
            block.chainid,
            address(this),
            fromTokenId,
            toTokenId
        )).toEthSignedMessageHash();

        address signer = digest.recover(signature);
        if (signer != ownerOf(toTokenId)) revert BadSignature();

        ld.status = LinkStatus.Confirmed;
        ld.confirmedAt = uint64(block.timestamp);

        emit LinkConfirmed(id, fromTokenId, toTokenId);
    }

    // ── Views ────────────────────────────────────────────────

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function getSpirit(uint256 tokenId)
        external
        view
        returns (bytes32 expressionHash, string memory emotion, uint256 mintedAt)
    {
        SpiritData memory d = spirits[tokenId];
        return (d.expressionHash, d.emotion, d.mintedAt);
    }

    function getLinksForToken(uint256 tokenId) external view returns (bytes32[] memory) {
        return linksByToken[tokenId];
    }

    function getLink(bytes32 id)
        external
        view
        returns (uint256 fromTokenId, uint256 toTokenId, LinkStatus status, uint64 requestedAt, uint64 confirmedAt)
    {
        LinkData memory d = links[id];
        return (d.fromTokenId, d.toTokenId, d.status, d.requestedAt, d.confirmedAt);
    }

    // ── Internals ────────────────────────────────────────────

    // ── OZ v5 required overrides ─────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        address from = _ownerOf(tokenId);
        // Block transfers (but allow mint: from == 0) if soulbound.
        if (soulbound && from != address(0) && to != address(0)) {
            revert Soulbound();
        }
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
