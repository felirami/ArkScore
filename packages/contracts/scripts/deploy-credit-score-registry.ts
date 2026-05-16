import { network } from "hardhat";

async function main() {
  const { ethers } = await network.create();
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error("No deployer signer available.");
  }

  const registry = await ethers.deployContract("CreditScoreRegistry", [
    deployer.address
  ]);
  await registry.waitForDeployment();

  const address = await registry.getAddress();

  console.log("CreditScoreRegistry deployed");
  console.log(`deployer=${deployer.address}`);
  console.log(`address=${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
