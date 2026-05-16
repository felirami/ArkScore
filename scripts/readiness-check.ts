import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

const strict = process.argv.includes("--strict");
const rootEnv = readEnvFile(".env");
const contractEnv = readEnvFile("packages/contracts/.env");
const webEnv = readEnvFile("apps/web/.env.local");
const apiEnv = readEnvFile("apps/api/.env");
const combinedEnv = {
  ...rootEnv,
  ...contractEnv,
  ...apiEnv,
  ...webEnv,
  ...process.env
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const checks: Check[] = [
    checkNodeVersion(),
    checkFile("apps/web/src/app/page.tsx", "Next.js App Router entry"),
    checkFile("apps/api/src/routes/score.ts", "Railway score endpoint"),
    checkFile(
      "packages/contracts/contracts/CreditScoreRegistry.sol",
      "CreditScoreRegistry contract"
    ),
    checkFile("railway.toml", "Railway root deployment config"),
    checkFile("vercel.json", "Vercel root deployment config"),
    checkSecretPresence(
      "Wavy Node credentials",
      ["WAVY_NODE_API_KEY", "WAVY_NODE_PROJECT_ID"],
      "required for live Wavy Node source=wavy responses"
    ),
    checkSecretPresence(
      "Fuji deployer key",
      ["FUJI_PRIVATE_KEY"],
      "required to deploy CreditScoreRegistry to Avalanche Fuji"
    ),
    checkSecretPresence(
      "Frontend API URL",
      ["NEXT_PUBLIC_API_BASE_URL"],
      "required to point Vercel at the Railway API"
    ),
    checkSecretPresence(
      "Frontend registry address",
      ["NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS"],
      "required to enable Store on Fuji"
    ),
    checkSecretPresence(
      "Demo scorer address",
      ["ARKSCORE_SCORER_ADDRESS"],
      "required to prove the dashboard signer can store scores on Fuji"
    ),
    checkRailwayAuth()
  ];

  checks.push(
    await checkUrl("Vercel production URL", "https://arkscore-seven.vercel.app")
  );

  const failed = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  console.log("# ArkScore Readiness Check\n");
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }

  console.log("\n## Summary\n");
  console.log(
    `- Passing: ${checks.filter((check) => check.status === "pass").length}`
  );
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Failing: ${failed.length}`);
  console.log(`- Report id: ${reportId(checks)}`);

  if (strict && (failed.length > 0 || warnings.length > 0)) {
    process.exitCode = 1;
  }
}

function checkNodeVersion(): Check {
  const major = Number(process.versions.node.split(".")[0]);

  return major === 22
    ? {
        label: "Node.js runtime",
        status: "pass",
        detail: `using ${process.versions.node}`
      }
    : {
        label: "Node.js runtime",
        status: "fail",
        detail: `expected Node 22.x, found ${process.versions.node}`
      };
}

function checkFile(path: string, label: string): Check {
  return existsSync(path)
    ? { label, status: "pass", detail: path }
    : { label, status: "fail", detail: `missing ${path}` };
}

function checkSecretPresence(
  label: string,
  keys: string[],
  detail: string
): Check {
  const missing = keys.filter((key) => !hasUsableValue(combinedEnv[key]));

  return missing.length === 0
    ? { label, status: "pass", detail }
    : {
        label,
        status: "warn",
        detail: `${detail}; missing ${missing.join(", ")}`
      };
}

function checkRailwayAuth(): Check {
  const result = spawnSync("pnpm", ["dlx", "@railway/cli", "whoami"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  if (result.status === 0) {
    return {
      label: "Railway CLI auth",
      status: "pass",
      detail: "authenticated"
    };
  }

  return {
    label: "Railway CLI auth",
    status: "warn",
    detail: "not authenticated; run railway login or provide RAILWAY_TOKEN"
  };
}

async function checkUrl(label: string, url: string): Promise<Check> {
  try {
    const response = await fetch(url, { method: "HEAD" });

    return response.ok
      ? { label, status: "pass", detail: `${url} returned ${response.status}` }
      : { label, status: "fail", detail: `${url} returned ${response.status}` };
  } catch (error) {
    return {
      label,
      status: "fail",
      detail: error instanceof Error ? error.message : `could not reach ${url}`
    };
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
        const value = line.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");

        return [key, value];
      })
  );
}

function hasUsableValue(value: string | undefined): boolean {
  return Boolean(
    value &&
      value.trim() &&
      !value.includes("replace_with") &&
      !value.includes("your-") &&
      value !== "0x..."
  );
}

function icon(status: CheckStatus): string {
  if (status === "pass") return "[pass]";
  if (status === "warn") return "[warn]";
  return "[fail]";
}

function reportId(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}
