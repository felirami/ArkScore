import { config as loadEnv } from "dotenv";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import { defineConfig } from "hardhat/config";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const configDir = dirname(fileURLToPath(import.meta.url));

loadEnv({ path: join(configDir, ".env"), override: false, quiet: true });
loadEnv({
  path: join(configDir, "..", "..", ".env"),
  override: false,
  quiet: true,
});

const fujiRpcUrl =
  process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const fujiPrivateKey = process.env.FUJI_PRIVATE_KEY?.trim();

const fujiAccounts =
  fujiPrivateKey && /^0x[a-fA-F0-9]{64}$/.test(fujiPrivateKey)
    ? [fujiPrivateKey]
    : [];

const config = defineConfig({
  plugins: [hardhatEthers, hardhatEthersChaiMatchers, hardhatMocha],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    fuji: {
      type: "http",
      chainType: "l1",
      url: fujiRpcUrl,
      chainId: 43113,
      accounts: fujiAccounts,
    },
  },
});

export default config;
