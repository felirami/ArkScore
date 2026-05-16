import "dotenv/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatEthersChaiMatchers from "@nomicfoundation/hardhat-ethers-chai-matchers";
import hardhatMocha from "@nomicfoundation/hardhat-mocha";
import { defineConfig } from "hardhat/config";

const fujiRpcUrl =
  process.env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";

const fujiAccounts = process.env.FUJI_PRIVATE_KEY
  ? [process.env.FUJI_PRIVATE_KEY]
  : [];

const config = defineConfig({
  plugins: [hardhatEthers, hardhatEthersChaiMatchers, hardhatMocha],
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1"
    },
    fuji: {
      type: "http",
      chainType: "l1",
      url: fujiRpcUrl,
      chainId: 43113,
      accounts: fujiAccounts
    }
  }
});

export default config;
