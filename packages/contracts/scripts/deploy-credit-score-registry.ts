import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

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
  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = Number(providerNetwork.chainId);
  const deployment = {
    contract: "CreditScoreRegistry",
    address,
    deployer: deployer.address,
    chainId,
    network: chainId === 43113 ? "fuji" : providerNetwork.name,
    deployedAt: new Date().toISOString()
  };
  const deploymentDir = join(process.cwd(), "deployments", deployment.network);
  const deploymentPath = join(deploymentDir, "CreditScoreRegistry.json");

  await mkdir(deploymentDir, { recursive: true });
  await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log("CreditScoreRegistry deployed");
  console.log(`deployer=${deployer.address}`);
  console.log(`address=${address}`);
  console.log(`deployment=${deploymentPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
