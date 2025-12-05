// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title TravelSBT
 * @dev Soul-Bound Token (non-transferable NFT) for TripIt traveler identity
 * @notice This token is bound to the wallet and cannot be transferred
 */
contract TravelSBT is ERC721Enumerable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    Counters.Counter private _tokenIdCounter;

    struct TravelerProfile {
        string profileHash;      // SHA-256 hash of profile data (salted off-chain)
        uint256 reputationScore; // 0-10000 (representing 0.00 to 100.00)
        uint256 mintedAt;        // Timestamp when SBT was issued
        bool isActive;           // Can be revoked by admin
    }

    // Token ID => Profile data
    mapping(uint256 => TravelerProfile) public profiles;

    // Token ID => Token URI (IPFS or HTTP URL for metadata)
    mapping(uint256 => string) private _tokenURIs;

    // Wallet => Token ID (one SBT per wallet)
    mapping(address => uint256) public walletToTokenId;

    // Events
    event SBTMinted(address indexed to, uint256 indexed tokenId, string profileHash, uint256 reputationScore);
    event SBTRevoked(uint256 indexed tokenId, address indexed owner);
    event ReputationUpdated(uint256 indexed tokenId, uint256 oldScore, uint256 newScore);
    event ProfileHashUpdated(uint256 indexed tokenId, string newProfileHash);

    constructor() ERC721("TripIt Travel SBT", "TSBT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @dev Mint a new Soul-Bound Token (can only be called by MINTER_ROLE)
     * @param to Wallet address to receive the SBT
     * @param profileHash SHA-256 hash of traveler's profile data
     * @param reputationScore Initial reputation score (0-10000)
     * @param tokenUri Optional metadata URI (IPFS or HTTP)
     * @return tokenId The ID of the newly minted SBT
     */
    function mintSBT(
        address to,
        string memory profileHash,
        uint256 reputationScore,
        string memory tokenUri
    ) public onlyRole(MINTER_ROLE) returns (uint256) {
        require(to != address(0), "TravelSBT: Cannot mint to zero address");
        require(balanceOf(to) == 0, "TravelSBT: Address already has an SBT");
        require(reputationScore <= 10000, "TravelSBT: Invalid reputation score");
        require(bytes(profileHash).length > 0, "TravelSBT: Profile hash cannot be empty");

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();

        _safeMint(to, tokenId);

        profiles[tokenId] = TravelerProfile({
            profileHash: profileHash,
            reputationScore: reputationScore,
            mintedAt: block.timestamp,
            isActive: true
        });

        walletToTokenId[to] = tokenId;

        if (bytes(tokenUri).length > 0) {
            _tokenURIs[tokenId] = tokenUri;
        }

        emit SBTMinted(to, tokenId, profileHash, reputationScore);
        return tokenId;
    }

    /**
     * @dev Update the reputation score for a token (backend can update based on activity)
     * @param tokenId The ID of the token to update
     * @param newScore New reputation score (0-10000)
     */
    function updateReputationScore(uint256 tokenId, uint256 newScore)
        public
        onlyRole(MINTER_ROLE)
    {
        require(_exists(tokenId), "TravelSBT: Token does not exist");
        require(newScore <= 10000, "TravelSBT: Invalid reputation score");
        require(profiles[tokenId].isActive, "TravelSBT: Token has been revoked");

        uint256 oldScore = profiles[tokenId].reputationScore;
        profiles[tokenId].reputationScore = newScore;

        emit ReputationUpdated(tokenId, oldScore, newScore);
    }

    /**
     * @dev Update the profile hash (e.g., when emergency contacts change)
     * @param tokenId The ID of the token to update
     * @param newProfileHash New SHA-256 hash of profile data
     */
    function updateProfileHash(uint256 tokenId, string memory newProfileHash)
        public
        onlyRole(MINTER_ROLE)
    {
        require(_exists(tokenId), "TravelSBT: Token does not exist");
        require(bytes(newProfileHash).length > 0, "TravelSBT: Profile hash cannot be empty");
        require(profiles[tokenId].isActive, "TravelSBT: Token has been revoked");

        profiles[tokenId].profileHash = newProfileHash;

        emit ProfileHashUpdated(tokenId, newProfileHash);
    }

    /**
     * @dev Revoke an SBT (marks as inactive, but doesn't burn)
     * @param tokenId The ID of the token to revoke
     */
    function revokeSBT(uint256 tokenId) public onlyRole(ADMIN_ROLE) {
        require(_exists(tokenId), "TravelSBT: Token does not exist");
        require(profiles[tokenId].isActive, "TravelSBT: Token already revoked");

        profiles[tokenId].isActive = false;
        address owner = ownerOf(tokenId);

        emit SBTRevoked(tokenId, owner);
    }

    /**
     * @dev Get the profile data for a token
     * @param tokenId The token ID to query
     * @return profileHash The profile hash
     * @return reputationScore The reputation score
     * @return mintedAt The mint timestamp
     * @return isActive Whether the token is active
     */
    function getProfile(uint256 tokenId)
        public
        view
        returns (
            string memory profileHash,
            uint256 reputationScore,
            uint256 mintedAt,
            bool isActive
        )
    {
        require(_exists(tokenId), "TravelSBT: Token does not exist");
        TravelerProfile memory profile = profiles[tokenId];
        return (profile.profileHash, profile.reputationScore, profile.mintedAt, profile.isActive);
    }

    /**
     * @dev Get the token ID for a wallet address
     * @param wallet The wallet address to query
     * @return tokenId The token ID (0 if no SBT)
     * @return hasToken Whether the wallet has an SBT
     */
    function getTokenIdByWallet(address wallet)
        public
        view
        returns (uint256 tokenId, bool hasToken)
    {
        uint256 balance = balanceOf(wallet);
        if (balance > 0) {
            return (walletToTokenId[wallet], true);
        }
        return (0, false);
    }

    /**
     * @dev Get the token URI for a token
     * @param tokenId The token ID to query
     * @return The token URI (may be empty)
     */
    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "TravelSBT: Token does not exist");
        string memory _tokenURI = _tokenURIs[tokenId];

        // Return custom URI if set, otherwise return empty string
        return bytes(_tokenURI).length > 0 ? _tokenURI : "";
    }

    /**
     * @dev Override to make token soul-bound (non-transferable)
     * Only minting is allowed (from == address(0))
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal virtual override {
        require(
            from == address(0) || to == address(0),
            "TravelSBT: Soul-Bound tokens cannot be transferred"
        );
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    /**
     * @dev Override to prevent approvals (since transfers are disabled)
     */
    function approve(address /* to */, uint256 /* tokenId */) public virtual override(ERC721, IERC721) {
        revert("TravelSBT: Soul-Bound tokens cannot be approved for transfer");
    }

    /**
     * @dev Override to prevent approvals (since transfers are disabled)
     */
    function setApprovalForAll(address /* operator */, bool /* approved */) public virtual override(ERC721, IERC721) {
        revert("TravelSBT: Soul-Bound tokens cannot be approved for transfer");
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
