import { network } from "hardhat";

const fujiChainId = 43113;
const recommendedBalance = 0.05;

async function main() {
  console.log("# ArkScore Fuji Deployer Probe\n");

  const privateKey = process.env.FUJI_PRIVATE_KEY?.trim();

  if (!privateKey) {
    fail("FUJI_PRIVATE_KEY is required to probe the Fuji deployer.");
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    fail("FUJI_PRIVATE_KEY must be a 32-byte 0x-prefixed hex private key.");
  }

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
    fail("No deployer signer is available from FUJI_PRIVATE_KEY.");
  }

  const balance = await ethers.provider.getBalance(deployer.address);
  const balanceAvax = Number(ethers.formatEther(balance));

  console.log("[pass] Connected to Avalanche Fuji");
  console.log(`[pass] Deployer address: ${deployer.address}`);

  if (balance === 0n) {
    fail("Deployer balance is 0 AVAX. Fund it with Fuji test AVAX first.");
  }

  if (balanceAvax < recommendedBalance) {
    console.log(
      `[warn] Deployer balance is ${balanceAvax.toFixed(6)} AVAX; ${recommendedBalance} AVAX is recommended before deploying.`,
    );
    return;
  }

  console.log(
    `[pass] Deployer balance: ${balanceAvax.toFixed(6)} AVAX available for deployment`,
  );
}

function fail(message: string): never {
  console.error(`[fail] ${message}`);
  process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
