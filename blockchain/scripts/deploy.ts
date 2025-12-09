import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting deployment...");

  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with account: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH\n`);

  console.log("Deploying TravelSBT...");
  const TravelSBT = await ethers.getContractFactory("TravelSBT");
  const travelSBT = await TravelSBT.deploy();
  await travelSBT.waitForDeployment();
  const travelSBTAddress = await travelSBT.getAddress();
  console.log(`TravelSBT deployed to: ${travelSBTAddress}`);

  console.log("\nDeploying SafetyRegistry...");
  const SafetyRegistry = await ethers.getContractFactory("SafetyRegistry");
  const safetyRegistry = await SafetyRegistry.deploy();
  await safetyRegistry.waitForDeployment();
  const safetyRegistryAddress = await safetyRegistry.getAddress();
  console.log(`SafetyRegistry deployed to: ${safetyRegistryAddress}`);

  const backendSignerAddress = process.env.BACKEND_SIGNER_ADDRESS;
  if (backendSignerAddress) {
    console.log(`\nGranting MINTER_ROLE to backend signer: ${backendSignerAddress}`);
    const MINTER_ROLE = await travelSBT.MINTER_ROLE();
    const tx = await travelSBT.grantRole(MINTER_ROLE, backendSignerAddress);
    await tx.wait();
    console.log("MINTER_ROLE granted successfully");
  } else {
    console.log("\nBACKEND_SIGNER_ADDRESS not set in .env - skipping MINTER_ROLE grant");
  }

  const networkInfo = await ethers.provider.getNetwork();
  const deploymentInfo = {
    network: networkInfo.name || "unknown",
    chainId: networkInfo.chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      TravelSBT: {
        address: travelSBTAddress,
        deploymentTx: travelSBT.deploymentTransaction()?.hash,
      },
      SafetyRegistry: {
        address: safetyRegistryAddress,
        deploymentTx: safetyRegistry.deploymentTransaction()?.hash,
      },
    },
    backendSigner: backendSignerAddress || "Not set",
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });

  const deploymentFilePath = path.join(
    deploymentsDir,
    `deployment-${deploymentInfo.chainId}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentInfo, null, 2));

  console.log(`\nDeployment info saved to: ${deploymentFilePath}`);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT COMPLETE");
  console.log("=".repeat(60));
  console.log(`Network: ${deploymentInfo.network} (chainId ${deploymentInfo.chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`TravelSBT: ${travelSBTAddress}`);
  console.log(`SafetyRegistry: ${safetyRegistryAddress}`);
  console.log("\nUpdate backend/.env with:");
  console.log(`  SBT_CONTRACT_ADDRESS=${travelSBTAddress}`);
  console.log(`  SAFETY_REGISTRY_ADDRESS=${safetyRegistryAddress}`);
}

main().catch((error) => {
  console.error("\nDeployment failed:");
  console.error(error);
  process.exitCode = 1;
});
