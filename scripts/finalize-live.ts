import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type DeploymentArtifact = {
  address?: string;
};

const apply = process.argv.includes("--apply");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env
};
const apiUrl = normalizeBaseUrl(
  env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL
);
const registryAddress =
  env.ARKSCORE_REGISTRY_ADDRESS ??
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS ??
  readRegistryDeployment()?.address;
const scorerAddress = env.ARKSCORE_SCORER_ADDRESS;
const vercelScope = env.VERCEL_SCOPE ?? "feliramis-projects";
const webUrl = env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app";

main();

function main() {
  console.log("# ArkScore Live Finalization\n");

  if (!apiUrl) {
    fail("Missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL.");
  }

  if (!registryAddress || !isAddress(registryAddress)) {
    fail(
      "Missing registry address. Set ARKSCORE_REGISTRY_ADDRESS or deploy Fuji contract first."
    );
  }

  const envCommands = [
    vercelEnvCommand("NEXT_PUBLIC_API_BASE_URL", apiUrl),
    vercelEnvCommand("NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS", registryAddress),
    vercelEnvCommand("NEXT_PUBLIC_ENABLE_DEMO_FALLBACK", "false")
  ];
  const deployCommand = [
    "pnpm",
    "dlx",
    "vercel",
    "deploy",
    ".",
    "--prod",
    "-y",
    "--scope",
    vercelScope
  ];
  const verifyCommand = [
    "pnpm",
    "verify:live:strict"
  ];
  const verifyEnv = {
    ...process.env,
    ARKSCORE_API_URL: apiUrl,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
    ARKSCORE_WEB_URL: webUrl
  };

  if (!apply) {
    console.log("Dry run. Re-run `pnpm finalize:live:apply` to apply.\n");
    for (const command of envCommands) printCommand(command);
    printCommand(deployCommand);
    console.log(`${renderVerifyEnv()} pnpm verify:live:strict`);
    return;
  }

  for (const command of envCommands) run(command);
  run(deployCommand);
  run(verifyCommand, verifyEnv);
}

function vercelEnvCommand(name: string, value: string) {
  return [
    "pnpm",
    "dlx",
    "vercel",
    "env",
    "add",
    name,
    "production",
    "--value",
    value,
    "--force",
    "--yes",
    "--scope",
    vercelScope,
    "--no-sensitive"
  ];
}

function run(command: string[], commandEnv = process.env) {
  printCommand(command);
  const [binary, ...args] = command;
  const result = spawnSync(binary, args, {
    env: commandEnv,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printCommand(command: string[]) {
  console.log(`$ ${command.map(shellEscape).join(" ")}`);
}

function renderVerifyEnv() {
  return Object.entries({
    ARKSCORE_API_URL: apiUrl,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {})
  })
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(" ");
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
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");

        return [key, value];
      })
  );
}

function readRegistryDeployment(): DeploymentArtifact | undefined {
  const path = "packages/contracts/deployments/fuji/CreditScoreRegistry.json";
  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as DeploymentArtifact;
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function shellEscape(value: string) {
  return /^[A-Za-z0-9_/:=.@-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
