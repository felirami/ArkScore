import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type DeploymentArtifact = {
  address?: string;
};

const apply = process.argv.includes("--apply");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const apiUrl = normalizeBaseUrl(
  env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL,
);
const registryAddress =
  env.ARKSCORE_REGISTRY_ADDRESS ??
  env.CREDIT_SCORE_REGISTRY_ADDRESS ??
  env.REGISTRY_ADDRESS ??
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS ??
  readRegistryDeployment()?.address;
const eerc20DemoAddress =
  env.ARKSCORE_EERC20_DEMO_ADDRESS ??
  env.EERC20_DEMO_ADDRESS ??
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS;
const scorerAddress = env.ARKSCORE_SCORER_ADDRESS ?? env.SCORER_ADDRESS;
const vercelScope = env.VERCEL_SCOPE ?? "feliramis-projects";
const vercelProject = env.VERCEL_PROJECT_NAME ?? "arkscore";
const webUrl = env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app";

main();

function main() {
  console.log("# ArkScore Live Finalization\n");

  if (!apiUrl) {
    fail("Missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL.");
  }

  if (!registryAddress || !isAddress(registryAddress)) {
    fail(
      "Missing registry address. Set ARKSCORE_REGISTRY_ADDRESS, CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, or deploy Fuji contract first.",
    );
  }

  if (eerc20DemoAddress && !isAddress(eerc20DemoAddress)) {
    fail("Invalid optional eERC20 demo address.");
  }

  const envCommands = [
    vercelEnvCommand("NEXT_PUBLIC_API_BASE_URL", apiUrl),
    vercelEnvCommand(
      "NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS",
      registryAddress,
    ),
    ...(eerc20DemoAddress
      ? [vercelEnvCommand("NEXT_PUBLIC_EERC20_DEMO_ADDRESS", eerc20DemoAddress)]
      : []),
    vercelEnvCommand("NEXT_PUBLIC_ENABLE_DEMO_FALLBACK", "false"),
  ];
  const authCommand = vercelCommand("whoami");
  const linkCommand = vercelCommand(
    "link",
    "--yes",
    "--project",
    vercelProject,
  );
  const deployCommand = [
    "pnpm",
    "dlx",
    "vercel",
    "deploy",
    ".",
    "--prod",
    "-y",
    "--scope",
    vercelScope,
    "--non-interactive",
  ];
  const verifyCommand = ["pnpm", "verify:live:strict"];
  const verifyEnv = {
    ...process.env,
    ARKSCORE_API_URL: apiUrl,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
    ARKSCORE_WEB_URL: webUrl,
  };

  if (!apply) {
    console.log("Dry run. Re-run `pnpm finalize:live:apply` to apply.\n");
    printCommand(authCommand);
    printCommand(linkCommand);
    for (const command of envCommands) printCommand(command);
    printCommand(deployCommand);
    console.log(`${renderVerifyEnv()} pnpm verify:live:strict`);
    return;
  }

  run(authCommand);
  run(linkCommand);
  for (const command of envCommands) run(command);
  run(deployCommand);
  run(verifyCommand, verifyEnv);
}

function vercelCommand(...args: string[]) {
  return [
    "pnpm",
    "dlx",
    "vercel",
    ...args,
    "--scope",
    vercelScope,
    "--non-interactive",
  ];
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
    "--no-sensitive",
    "--non-interactive",
  ];
}

function run(command: string[], commandEnv = process.env) {
  printCommand(command);
  const [binary, ...args] = command;
  const result = spawnSync(binary, args, {
    env: commandEnv,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printCommand(command: string[]) {
  console.log(`$ ${command.map(shellEscape).join(" ")}`);
}

function renderVerifyEnv() {
  const verifyEnv: Record<string, string> = {
    ARKSCORE_API_URL: apiUrl ?? "",
    ARKSCORE_REGISTRY_ADDRESS: registryAddress ?? "",
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
  };

  return Object.entries(verifyEnv)
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
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      }),
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
