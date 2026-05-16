import { network } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type DeploymentArtifact = {
  address?: string;
};

type CreditScoreRegistryInstance = {
  setScorer: (
    scorer: string,
    authorized: boolean
  ) => Promise<{ hash: string; wait: () => Promise<unknown> }>;
  isScorer: (scorer: string) => Promise<boolean>;
};

async function main() {
  const { ethers } = await network.create();
  const [owner] = await ethers.getSigners();

  if (!owner) {
    throw new Error("No owner signer available.");
  }

  const registryAddress =
    process.env.CREDIT_SCORE_REGISTRY_ADDRESS ??
    process.env.REGISTRY_ADDRESS ??
    process.env.ARKSCORE_REGISTRY_ADDRESS ??
    readRegistryDeployment()?.address;
  const scorerAddress =
    process.env.SCORER_ADDRESS ?? process.env.ARKSCORE_SCORER_ADDRESS;
  const authorized = process.env.SCORER_AUTHORIZED !== "false";

  if (!registryAddress || !ethers.isAddress(registryAddress)) {
    throw new Error(
      "Set CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, ARKSCORE_REGISTRY_ADDRESS, or deploy first."
    );
  }

  if (!scorerAddress || !ethers.isAddress(scorerAddress)) {
    throw new Error("Set SCORER_ADDRESS or ARKSCORE_SCORER_ADDRESS.");
  }

  const registry = (await ethers.getContractAt(
    "CreditScoreRegistry",
    registryAddress
  )) as unknown as CreditScoreRegistryInstance;
  const tx = await registry.setScorer(scorerAddress, authorized);

  console.log("Updating scorer");
  console.log(`owner=${owner.address}`);
  console.log(`registry=${registryAddress}`);
  console.log(`scorer=${scorerAddress}`);
  console.log(`authorized=${authorized}`);
  console.log(`tx=${tx.hash}`);

  await tx.wait();

  const isAuthorized = await registry.isScorer(scorerAddress);
  console.log(`confirmed=${isAuthorized}`);
}

function readRegistryDeployment(): DeploymentArtifact | undefined {
  const path = join(
    process.cwd(),
    "deployments",
    "fuji",
    "CreditScoreRegistry.json"
  );

  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as DeploymentArtifact;
  } catch {
    return undefined;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
