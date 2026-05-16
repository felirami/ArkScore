import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

type CheckStatus = "pass" | "warn";

type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

const encryptedErcRepoUrl = "https://github.com/ava-labs/EncryptedERC.git";
const fujiRpcUrl = "https://api.avax-test.network/ext/bc/C/rpc";
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...process.env,
};
const repoDir = resolve(env.EERC20_REPO_DIR ?? "../EncryptedERC");
const mode = parseMode(env.EERC20_MODE);
const deployScript =
  mode === "converter"
    ? "scripts/deploy-converter.ts"
    : "scripts/deploy-standalone.ts";
const configuredAddress =
  env.ARKSCORE_EERC20_DEMO_ADDRESS ??
  env.EERC20_DEMO_ADDRESS ??
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS;

main();

function main() {
  const repoExists = existsSync(repoDir);
  const hardhatConfigPath = `${repoDir}/hardhat.config.ts`;
  const hardhatConfig = repoExists ? safeRead(hardhatConfigPath) : undefined;
  const checks: Check[] = [
    {
      label: "EncryptedERC source",
      status: "pass",
      detail: encryptedErcRepoUrl,
    },
    repoExists
      ? {
          label: "Local EncryptedERC checkout",
          status: "pass",
          detail: repoDir,
        }
      : {
          label: "Local EncryptedERC checkout",
          status: "warn",
          detail: `missing ${repoDir}; clone the official repo first`,
        },
    checkRepoFile("package.json"),
    checkRepoFile("scripts/deploy-standalone.ts"),
    checkRepoFile("scripts/deploy-converter.ts"),
    checkRepoFile("hardhat.config.ts"),
    checkFujiNetwork(hardhatConfig),
    checkCircom(),
    checkPrivateKey(),
    checkConfiguredAddress(),
  ];

  console.log("# ArkScore eERC20 Handoff Planner\n");
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }

  console.log("\n## Recommended Commands\n");
  console.log("```bash");
  if (!repoExists) {
    console.log(`git clone ${encryptedErcRepoUrl} ${shellEscape(repoDir)}`);
  }
  console.log(`cd ${shellEscape(repoDir)}`);
  console.log("npm install");
  console.log("npx hardhat compile");
  console.log("npx hardhat zkit make --force");
  console.log("npx hardhat zkit verifiers");
  if (!hardhatConfig || !hasFujiNetwork(hardhatConfig)) {
    console.log(
      "# Add a Fuji network to EncryptedERC hardhat.config.ts with RPC_URL, chainId 43113, and a funded deployer account.",
    );
  }
  console.log(
    `RPC_URL=${fujiRpcUrl} npx hardhat run ${deployScript} --network fuji`,
  );
  console.log("cd -");
  console.log("ARKSCORE_EERC20_DEMO_ADDRESS=0x... pnpm probe:eerc20:strict");
  console.log(
    "ARKSCORE_REQUIRE_EERC20=true ARKSCORE_EERC20_DEMO_ADDRESS=0x... pnpm readiness:strict:record",
  );
  console.log(
    "ARKSCORE_REQUIRE_EERC20=true ARKSCORE_EERC20_DEMO_ADDRESS=0x... pnpm verify:live:strict:eerc20:record",
  );
  console.log("```\n");
  console.log(
    "Use the deployed EncryptedERC address as NEXT_PUBLIC_EERC20_DEMO_ADDRESS for Vercel once the strict probe passes.",
  );
}

function checkRepoFile(path: string): Check {
  const absolutePath = `${repoDir}/${path}`;

  return existsSync(absolutePath)
    ? {
        label: `EncryptedERC ${path}`,
        status: "pass",
        detail: absolutePath,
      }
    : {
        label: `EncryptedERC ${path}`,
        status: "warn",
        detail: `missing ${absolutePath}`,
      };
}

function checkFujiNetwork(hardhatConfig: string | undefined): Check {
  if (!hardhatConfig) {
    return {
      label: "EncryptedERC Fuji network",
      status: "warn",
      detail: "hardhat.config.ts is not available to inspect",
    };
  }

  if (hasFujiNetwork(hardhatConfig)) {
    return {
      label: "EncryptedERC Fuji network",
      status: "pass",
      detail: "hardhat.config.ts includes Fuji chain id 43113",
    };
  }

  return {
    label: "EncryptedERC Fuji network",
    status: "warn",
    detail:
      "official repo defaults to local/mainnet-oriented config; add a Fuji network before running the deploy script",
  };
}

function checkCircom(): Check {
  const result = spawnSync("circom", ["--version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status === 0) {
    return {
      label: "Circom compiler",
      status: "pass",
      detail: (result.stdout || result.stderr).trim(),
    };
  }

  return {
    label: "Circom compiler",
    status: "warn",
    detail: "not found on PATH; EncryptedERC requires Circom 2.1.9+",
  };
}

function checkPrivateKey(): Check {
  const privateKey = env.FUJI_PRIVATE_KEY?.trim();

  if (!privateKey) {
    return {
      label: "Fuji deployer key",
      status: "warn",
      detail: "missing FUJI_PRIVATE_KEY; required for a CLI deployment path",
    };
  }

  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return {
      label: "Fuji deployer key",
      status: "warn",
      detail: "configured value is not a 32-byte 0x-prefixed key",
    };
  }

  return {
    label: "Fuji deployer key",
    status: "pass",
    detail: "configured and redacted",
  };
}

function checkConfiguredAddress(): Check {
  if (!hasUsableValue(configuredAddress)) {
    return {
      label: "ArkScore eERC20 address",
      status: "warn",
      detail:
        "not configured yet; set ARKSCORE_EERC20_DEMO_ADDRESS after deployment",
    };
  }

  if (!isAddress(configuredAddress ?? "")) {
    return {
      label: "ArkScore eERC20 address",
      status: "warn",
      detail: "configured value is not a valid EVM address",
    };
  }

  return {
    label: "ArkScore eERC20 address",
    status: "pass",
    detail: `${configuredAddress} is ready for pnpm probe:eerc20`,
  };
}

function hasFujiNetwork(hardhatConfig: string): boolean {
  return /fuji/i.test(hardhatConfig) && /43113/.test(hardhatConfig);
}

function parseMode(value: string | undefined): "standalone" | "converter" {
  if (!value || value === "standalone") return "standalone";
  if (value === "converter") return "converter";

  throw new Error("EERC20_MODE must be standalone or converter.");
}

function hasUsableValue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();

  return (
    !normalized.includes("replace_with") &&
    normalized !== "0x..." &&
    normalized !== "tbd"
  );
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function safeRead(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      }),
  );
}

function shellEscape(value: string): string {
  if (/^[A-Za-z0-9_./:=@+-]+$/.test(value)) return value;

  return `'${value.replace(/'/g, "'\\''")}'`;
}

function icon(status: CheckStatus): string {
  return status === "pass" ? "[pass]" : "[warn]";
}
