import { expect } from "chai";
import { ethers } from "hardhat";
import { TravelSBT } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("TravelSBT", function () {
  let travelSBT: TravelSBT;
  let owner: SignerWithAddress;
  let minter: SignerWithAddress;
  let traveler1: SignerWithAddress;
  let traveler2: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const PROFILE_HASH = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const REPUTATION_SCORE = 5000; // 50.00
  const TOKEN_URI = "ipfs://QmTest123";

  beforeEach(async function () {
    [owner, minter, traveler1, traveler2, unauthorized] = await ethers.getSigners();

    // Deploy contract
    const TravelSBT = await ethers.getContractFactory("TravelSBT");
    travelSBT = await TravelSBT.deploy();
    await travelSBT.waitForDeployment();

    // Grant MINTER_ROLE to minter address
    const MINTER_ROLE = await travelSBT.MINTER_ROLE();
    await travelSBT.grantRole(MINTER_ROLE, minter.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await travelSBT.name()).to.equal("TripIt Travel SBT");
      expect(await travelSBT.symbol()).to.equal("TSBT");
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN_ROLE = await travelSBT.DEFAULT_ADMIN_ROLE();
      expect(await travelSBT.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
    });

    it("Should grant MINTER_ROLE to minter", async function () {
      const MINTER_ROLE = await travelSBT.MINTER_ROLE();
      expect(await travelSBT.hasRole(MINTER_ROLE, minter.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint SBT with profile hash and reputation", async function () {
      await expect(
        travelSBT.connect(minter).mintSBT(
          traveler1.address,
          PROFILE_HASH,
          REPUTATION_SCORE,
          TOKEN_URI
        )
      )
        .to.emit(travelSBT, "SBTMinted")
        .withArgs(traveler1.address, 0, PROFILE_HASH, REPUTATION_SCORE);

      // Check balance
      expect(await travelSBT.balanceOf(traveler1.address)).to.equal(1);

      // Check token ownership
      expect(await travelSBT.ownerOf(0)).to.equal(traveler1.address);
    });

    it("Should store profile data correctly", async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );

      const profile = await travelSBT.getProfile(0);
      expect(profile.profileHash).to.equal(PROFILE_HASH);
      expect(profile.reputationScore).to.equal(REPUTATION_SCORE);
      expect(profile.isActive).to.be.true;
    });

    it("Should store token URI correctly", async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );

      expect(await travelSBT.tokenURI(0)).to.equal(TOKEN_URI);
    });

    it("Should prevent minting without MINTER_ROLE", async function () {
      await expect(
        travelSBT.connect(unauthorized).mintSBT(
          traveler1.address,
          PROFILE_HASH,
          REPUTATION_SCORE,
          TOKEN_URI
        )
      ).to.be.reverted;
    });

    it("Should prevent minting multiple SBTs to same address", async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );

      await expect(
        travelSBT.connect(minter).mintSBT(
          traveler1.address,
          PROFILE_HASH,
          REPUTATION_SCORE,
          TOKEN_URI
        )
      ).to.be.revertedWith("TravelSBT: Address already has an SBT");
    });

    it("Should prevent minting with invalid reputation score", async function () {
      await expect(
        travelSBT.connect(minter).mintSBT(
          traveler1.address,
          PROFILE_HASH,
          10001, // Invalid: > 10000
          TOKEN_URI
        )
      ).to.be.revertedWith("TravelSBT: Invalid reputation score");
    });

    it("Should prevent minting with empty profile hash", async function () {
      await expect(
        travelSBT.connect(minter).mintSBT(
          traveler1.address,
          "",
          REPUTATION_SCORE,
          TOKEN_URI
        )
      ).to.be.revertedWith("TravelSBT: Profile hash cannot be empty");
    });
  });

  describe("Soulbound (Non-transferable)", function () {
    beforeEach(async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
    });

    it("Should prevent transferFrom", async function () {
      await expect(
        travelSBT.connect(traveler1).transferFrom(traveler1.address, traveler2.address, 0)
      ).to.be.revertedWith("TravelSBT: Soul-Bound tokens cannot be transferred");
    });

    it("Should prevent safeTransferFrom", async function () {
      await expect(
        travelSBT.connect(traveler1)["safeTransferFrom(address,address,uint256)"](
          traveler1.address,
          traveler2.address,
          0
        )
      ).to.be.revertedWith("TravelSBT: Soul-Bound tokens cannot be transferred");
    });

    it("Should prevent approve", async function () {
      await expect(
        travelSBT.connect(traveler1).approve(traveler2.address, 0)
      ).to.be.revertedWith("TravelSBT: Soul-Bound tokens cannot be approved for transfer");
    });

    it("Should prevent setApprovalForAll", async function () {
      await expect(
        travelSBT.connect(traveler1).setApprovalForAll(traveler2.address, true)
      ).to.be.revertedWith("TravelSBT: Soul-Bound tokens cannot be approved for transfer");
    });
  });

  describe("Reputation Score Updates", function () {
    beforeEach(async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
    });

    it("Should update reputation score", async function () {
      const newScore = 7500; // 75.00

      await expect(travelSBT.connect(minter).updateReputationScore(0, newScore))
        .to.emit(travelSBT, "ReputationUpdated")
        .withArgs(0, REPUTATION_SCORE, newScore);

      const profile = await travelSBT.getProfile(0);
      expect(profile.reputationScore).to.equal(newScore);
    });

    it("Should prevent updating reputation without MINTER_ROLE", async function () {
      await expect(
        travelSBT.connect(unauthorized).updateReputationScore(0, 7500)
      ).to.be.reverted;
    });

    it("Should prevent invalid reputation score", async function () {
      await expect(
        travelSBT.connect(minter).updateReputationScore(0, 10001)
      ).to.be.revertedWith("TravelSBT: Invalid reputation score");
    });
  });

  describe("Profile Hash Updates", function () {
    const NEW_PROFILE_HASH = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd";

    beforeEach(async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
    });

    it("Should update profile hash", async function () {
      await expect(travelSBT.connect(minter).updateProfileHash(0, NEW_PROFILE_HASH))
        .to.emit(travelSBT, "ProfileHashUpdated")
        .withArgs(0, NEW_PROFILE_HASH);

      const profile = await travelSBT.getProfile(0);
      expect(profile.profileHash).to.equal(NEW_PROFILE_HASH);
    });

    it("Should prevent updating profile hash without MINTER_ROLE", async function () {
      await expect(
        travelSBT.connect(unauthorized).updateProfileHash(0, NEW_PROFILE_HASH)
      ).to.be.reverted;
    });

    it("Should prevent empty profile hash", async function () {
      await expect(
        travelSBT.connect(minter).updateProfileHash(0, "")
      ).to.be.revertedWith("TravelSBT: Profile hash cannot be empty");
    });
  });

  describe("Revocation", function () {
    beforeEach(async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
    });

    it("Should revoke SBT", async function () {
      await expect(travelSBT.connect(owner).revokeSBT(0))
        .to.emit(travelSBT, "SBTRevoked")
        .withArgs(0, traveler1.address);

      const profile = await travelSBT.getProfile(0);
      expect(profile.isActive).to.be.false;
    });

    it("Should prevent revocation without ADMIN_ROLE", async function () {
      await expect(
        travelSBT.connect(unauthorized).revokeSBT(0)
      ).to.be.reverted;
    });

    it("Should prevent double revocation", async function () {
      await travelSBT.connect(owner).revokeSBT(0);

      await expect(
        travelSBT.connect(owner).revokeSBT(0)
      ).to.be.revertedWith("TravelSBT: Token already revoked");
    });

    it("Should prevent updating revoked SBT", async function () {
      await travelSBT.connect(owner).revokeSBT(0);

      await expect(
        travelSBT.connect(minter).updateReputationScore(0, 7500)
      ).to.be.revertedWith("TravelSBT: Token has been revoked");
    });
  });

  describe("Wallet Queries", function () {
    it("Should return token ID for wallet with SBT", async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );

      const result = await travelSBT.getTokenIdByWallet(traveler1.address);
      expect(result.tokenId).to.equal(0);
      expect(result.hasToken).to.be.true;
    });

    it("Should return false for wallet without SBT", async function () {
      const result = await travelSBT.getTokenIdByWallet(traveler2.address);
      expect(result.tokenId).to.equal(0);
      expect(result.hasToken).to.be.false;
    });
  });

  describe("ERC721Enumerable", function () {
    it("Should track total supply", async function () {
      expect(await travelSBT.totalSupply()).to.equal(0);

      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
      expect(await travelSBT.totalSupply()).to.equal(1);

      await travelSBT.connect(minter).mintSBT(
        traveler2.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );
      expect(await travelSBT.totalSupply()).to.equal(2);
    });

    it("Should enumerate tokens by owner", async function () {
      await travelSBT.connect(minter).mintSBT(
        traveler1.address,
        PROFILE_HASH,
        REPUTATION_SCORE,
        TOKEN_URI
      );

      const tokenId = await travelSBT.tokenOfOwnerByIndex(traveler1.address, 0);
      expect(tokenId).to.equal(0);
    });
  });
});
