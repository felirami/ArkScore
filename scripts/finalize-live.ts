import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type DeploymentArtifact = {
  address?: string;
};

const defaultScoreRecordArtifactPath =
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";
const apply = process.argv.includes("--apply");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const apiUrl = normalizeBaseUrl(
  firstConfiguredValue([env.ARKSCORE_API_URL, env.NEXT_PUBLIC_API_BASE_URL]),
);
const registryAddress = firstConfiguredValue([
  env.ARKSCORE_REGISTRY_ADDRESS,
  env.CREDIT_SCORE_REGISTRY_ADDRESS,
  env.REGISTRY_ADDRESS,
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
  readRegistryDeployment()?.address,
]);
const eerc20DemoAddress = firstConfiguredValue([
  env.ARKSCORE_EERC20_DEMO_ADDRESS,
  env.EERC20_DEMO_ADDRESS,
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
]);
const requireEerc20 = env.ARKSCORE_REQUIRE_EERC20 === "true";
const requireScoreRecord = env.ARKSCORE_REQUIRE_SCORE_RECORD === "true";
const scorerAddress = firstConfiguredValue([
  env.ARKSCORE_SCORER_ADDRESS,
  env.SCORER_ADDRESS,
]);
const vercelScope = env.VERCEL_SCOPE ?? "feliramis-projects";
const vercelProject = env.VERCEL_PROJECT_NAME ?? "arkscore";
const webUrl =
  normalizeBaseUrl(firstConfiguredValue([env.ARKSCORE_WEB_URL])) ??
  "https://arkscore-seven.vercel.app";
const configuredScoreRecordArtifactPath = firstConfiguredValue([
  env.ARKSCORE_SCORE_RECORD_ARTIFACT,
]);
const scoreRecordArtifactPath =
  configuredScoreRecordArtifactPath ?? defaultScoreRecordArtifactPath;
const shouldVerifyScoreRecord =
  requireScoreRecord ||
  isCustomScoreRecordArtifactPath(configuredScoreRecordArtifactPath) ||
  existsSync(scoreRecordArtifactPath);

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

  if (requireEerc20 && !eerc20DemoAddress) {
    fail("Missing eERC20 demo address while ARKSCORE_REQUIRE_EERC20=true.");
  }

  if (shouldVerifyScoreRecord && !existsSync(scoreRecordArtifactPath)) {
    fail(
      `Missing latest score record artifact at ${scoreRecordArtifactPath}. Run pnpm record:fuji first or unset ARKSCORE_REQUIRE_SCORE_RECORD/ARKSCORE_SCORE_RECORD_ARTIFACT.`,
    );
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
  const eerc20ProbeCommand = eerc20DemoAddress
    ? ["pnpm", requireEerc20 ? "probe:eerc20:strict" : "probe:eerc20"]
    : undefined;
  const eerc20ProbeEnv = {
    ...process.env,
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(requireEerc20 ? { ARKSCORE_REQUIRE_EERC20: "true" } : {}),
  };
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
  const verifyScript = finalVerifyScript();
  const preflightScript = shouldVerifyScoreRecord
    ? "verify:live:preflight:record"
    : "verify:live:preflight";
  const preflightCommand = ["pnpm", preflightScript];
  const verifyCommand = ["pnpm", verifyScript];
  const liveVerificationEnv = {
    ...process.env,
    ARKSCORE_API_URL: apiUrl,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(requireEerc20 ? { ARKSCORE_REQUIRE_EERC20: "true" } : {}),
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
    ...(shouldVerifyScoreRecord
      ? {
          ARKSCORE_SCORE_RECORD_ARTIFACT: scoreRecordArtifactPath,
          ARKSCORE_REQUIRE_SCORE_RECORD: "true",
        }
      : {}),
  };
  const verifyEnv = {
    ...liveVerificationEnv,
    ARKSCORE_WEB_URL: webUrl,
  };

  if (!apply) {
    console.log("Dry run. Re-run `pnpm finalize:live:apply` to apply.\n");
    printCommand(authCommand);
    printCommand(linkCommand);
    if (eerc20ProbeCommand) {
      console.log(`${renderEerc20ProbeEnv()} ${eerc20ProbeCommand.join(" ")}`);
    }
    console.log(`${renderPreflightEnv()} pnpm ${preflightScript}`);
    for (const command of envCommands) printCommand(command);
    printCommand(deployCommand);
    console.log(`${renderVerifyEnv()} pnpm ${verifyScript}`);
    return;
  }

  run(authCommand);
  run(linkCommand);
  if (eerc20ProbeCommand) run(eerc20ProbeCommand, eerc20ProbeEnv);
  run(preflightCommand, liveVerificationEnv);
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

function finalVerifyScript() {
  if (requireEerc20 && shouldVerifyScoreRecord) {
    return "verify:live:strict:eerc20:record";
  }

  if (requireEerc20) {
    return "verify:live:strict:eerc20";
  }

  return shouldVerifyScoreRecord
    ? "verify:live:strict:record"
    : "verify:live:strict";
}

function renderVerifyEnv() {
  const verifyEnv: Record<string, string> = {
    ARKSCORE_API_URL: apiUrl ?? "",
    ARKSCORE_REGISTRY_ADDRESS: registryAddress ?? "",
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(requireEerc20 ? { ARKSCORE_REQUIRE_EERC20: "true" } : {}),
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
    ...(shouldVerifyScoreRecord
      ? {
          ARKSCORE_SCORE_RECORD_ARTIFACT: scoreRecordArtifactPath,
          ARKSCORE_REQUIRE_SCORE_RECORD: "true",
        }
      : {}),
  };

  return Object.entries(verifyEnv)
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(" ");
}

function renderPreflightEnv() {
  const preflightEnv: Record<string, string> = {
    ARKSCORE_API_URL: apiUrl ?? "",
    ARKSCORE_REGISTRY_ADDRESS: registryAddress ?? "",
    ...(eerc20DemoAddress
      ? { ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress }
      : {}),
    ...(requireEerc20 ? { ARKSCORE_REQUIRE_EERC20: "true" } : {}),
    ...(scorerAddress ? { ARKSCORE_SCORER_ADDRESS: scorerAddress } : {}),
    ...(shouldVerifyScoreRecord
      ? {
          ARKSCORE_SCORE_RECORD_ARTIFACT: scoreRecordArtifactPath,
          ARKSCORE_REQUIRE_SCORE_RECORD: "true",
        }
      : {}),
  };

  return Object.entries(preflightEnv)
    .map(([key, value]) => `${key}=${shellEscape(value)}`)
    .join(" ");
}

function renderEerc20ProbeEnv() {
  if (!eerc20DemoAddress) return "";

  const probeEnv: Record<string, string> = {
    ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress,
    ...(requireEerc20 ? { ARKSCORE_REQUIRE_EERC20: "true" } : {}),
  };

  return Object.entries(probeEnv)
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

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function isCustomScoreRecordArtifactPath(value: string | undefined) {
  if (!value) return false;
  return normalizeRelativePath(value) !== defaultScoreRecordArtifactPath;
}

function normalizeRelativePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
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
