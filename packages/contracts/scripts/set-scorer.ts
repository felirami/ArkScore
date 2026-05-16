import { network } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type DeploymentArtifact = {
  address?: string;
};

type CreditScoreRegistryInstance = {
  setScorer: (
    scorer: string,
    authorized: boolean,
  ) => Promise<{ hash: string; wait: () => Promise<unknown> }>;
  isScorer: (scorer: string) => Promise<boolean>;
};

const fujiChainId = 43113;
const privateKeyRegex = /^0x[a-fA-F0-9]{64}$/;

async function main() {
  console.log("# ArkScore Fuji Scorer Authorization\n");
  validateFujiPrivateKey();

  const registryAddress =
    process.env.CREDIT_SCORE_REGISTRY_ADDRESS ??
    process.env.REGISTRY_ADDRESS ??
    process.env.ARKSCORE_REGISTRY_ADDRESS ??
    readRegistryDeployment()?.address;
  const scorerAddress =
    process.env.SCORER_ADDRESS ?? process.env.ARKSCORE_SCORER_ADDRESS;
  const authorized = parseAuthorized(process.env.SCORER_AUTHORIZED);

  const { ethers } = await network.create();
  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = Number(providerNetwork.chainId);

  if (chainId !== fujiChainId) {
    throw new Error(
      `Expected Avalanche Fuji chain id ${fujiChainId}, received ${chainId}.`,
    );
  }

  const [owner] = await ethers.getSigners();

  if (!owner) {
    throw new Error("No owner signer available from FUJI_PRIVATE_KEY.");
  }

  if (!registryAddress || !ethers.isAddress(registryAddress)) {
    throw new Error(
      "Set CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, ARKSCORE_REGISTRY_ADDRESS, or deploy first.",
    );
  }

  if (!scorerAddress || !ethers.isAddress(scorerAddress)) {
    throw new Error("Set SCORER_ADDRESS or ARKSCORE_SCORER_ADDRESS.");
  }

  const registry = (await ethers.getContractAt(
    "CreditScoreRegistry",
    registryAddress,
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
  if (isAuthorized !== authorized) {
    throw new Error(
      `Scorer authorization mismatch after tx: expected ${authorized}, got ${isAuthorized}.`,
    );
  }

  console.log(`confirmed=${isAuthorized}`);
}

function validateFujiPrivateKey() {
  const privateKey = process.env.FUJI_PRIVATE_KEY?.trim();

  if (!privateKey) {
    throw new Error("FUJI_PRIVATE_KEY is required to update Fuji scorers.");
  }

  if (!privateKeyRegex.test(privateKey)) {
    throw new Error(
      "FUJI_PRIVATE_KEY must be a 32-byte 0x-prefixed hex private key.",
    );
  }
}

function parseAuthorized(value: string | undefined) {
  if (value === undefined || value === "") return true;
  if (value === "true") return true;
  if (value === "false") return false;

  throw new Error("SCORER_AUTHORIZED must be true or false.");
}

function readRegistryDeployment(): DeploymentArtifact | undefined {
  const path = join(
    process.cwd(),
    "deployments",
    "fuji",
    "CreditScoreRegistry.json",
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
