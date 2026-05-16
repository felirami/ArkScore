import { network } from "hardhat";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const fujiChainId = 43113;

async function main() {
  console.log("# ArkScore CreditScoreRegistry Deployment\n");
  validateFujiPrivateKey();

  const { ethers } = await network.create();
  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = Number(providerNetwork.chainId);

  if (chainId !== fujiChainId) {
    fail(
      `Expected Avalanche Fuji chain id ${fujiChainId}, received ${chainId}.`,
    );
  }

  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    fail("No deployer signer available from FUJI_PRIVATE_KEY.");
  }

  const registry = await ethers.deployContract("CreditScoreRegistry", [
    deployer.address,
  ]);
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const owner = (await registry.getFunction("owner")()) as string;
  const isDeployerScorer = (await registry.getFunction("isScorer")(
    deployer.address,
  )) as boolean;

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    fail(
      `Deployment owner mismatch: expected ${deployer.address}, got ${owner}.`,
    );
  }

  if (!isDeployerScorer) {
    fail(`${deployer.address} was not authorized as the initial scorer.`);
  }

  const deployment = {
    contract: "CreditScoreRegistry",
    address,
    deployer: deployer.address,
    chainId,
    network: "fuji",
    owner,
    initialScorer: deployer.address,
    deployedAt: new Date().toISOString(),
  };
  const deploymentDir = join(process.cwd(), "deployments", deployment.network);
  const deploymentPath = join(deploymentDir, "CreditScoreRegistry.json");

  await mkdir(deploymentDir, { recursive: true });
  await writeFile(deploymentPath, `${JSON.stringify(deployment, null, 2)}\n`);

  console.log("[pass] Connected to Avalanche Fuji");
  console.log("[pass] CreditScoreRegistry deployed");
  console.log(`[pass] Owner verified: ${owner}`);
  console.log(`[pass] Initial scorer authorized: ${deployer.address}`);
  console.log(`address=${address}`);
  console.log(`deployment=${deploymentPath}`);
}

function validateFujiPrivateKey() {
  const privateKey = process.env.FUJI_PRIVATE_KEY?.trim();

  if (!privateKey) {
    fail("FUJI_PRIVATE_KEY is required to deploy CreditScoreRegistry to Fuji.");
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    fail("FUJI_PRIVATE_KEY must be a 32-byte 0x-prefixed hex private key.");
  }
}

function fail(message: string): never {
  console.error(`[fail] ${message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
