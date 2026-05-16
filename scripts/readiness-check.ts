import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

type Candidate = {
  key: string;
  value?: string;
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
  ...process.env,
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
    checkFile("apps/api/src/routes/openapi.ts", "Railway OpenAPI endpoint"),
    checkFile(
      "packages/contracts/contracts/CreditScoreRegistry.sol",
      "CreditScoreRegistry contract",
    ),
    checkFile("railway.toml", "Railway root deployment config"),
    checkFile("vercel.json", "Vercel root deployment config"),
    checkSecretPresence(
      "Wavy Node credentials",
      ["WAVY_NODE_API_KEY", "WAVY_NODE_PROJECT_ID"],
      "required for live Wavy Node source=wavy responses",
    ),
    checkSecretPresence(
      "Subject hash salt",
      ["ARKSCORE_SUBJECT_HASH_SALT"],
      "required to keep on-chain subject hashes environment-specific",
    ),
    checkSecretPresence(
      "Fuji deployer key",
      ["FUJI_PRIVATE_KEY"],
      "required to deploy CreditScoreRegistry to Avalanche Fuji",
    ),
    checkUrlPresence(
      "Frontend API URL",
      [
        { key: "ARKSCORE_API_URL", value: combinedEnv.ARKSCORE_API_URL },
        {
          key: "NEXT_PUBLIC_API_BASE_URL",
          value: combinedEnv.NEXT_PUBLIC_API_BASE_URL,
        },
      ],
      "required to point Vercel at the Railway API during finalization",
    ),
    checkAddressPresence(
      "Frontend registry address",
      [
        {
          key: "ARKSCORE_REGISTRY_ADDRESS",
          value: combinedEnv.ARKSCORE_REGISTRY_ADDRESS,
        },
        {
          key: "CREDIT_SCORE_REGISTRY_ADDRESS",
          value: combinedEnv.CREDIT_SCORE_REGISTRY_ADDRESS,
        },
        { key: "REGISTRY_ADDRESS", value: combinedEnv.REGISTRY_ADDRESS },
        {
          key: "NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS",
          value: combinedEnv.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
        },
        {
          key: "packages/contracts/deployments/fuji/CreditScoreRegistry.json",
          value: readRegistryDeployment()?.address,
        },
      ],
      "required to enable Store on Fuji and set Vercel public env",
    ),
    checkOptionalAddressPresence(
      "Optional eERC20 demo address",
      [
        {
          key: "ARKSCORE_EERC20_DEMO_ADDRESS",
          value: combinedEnv.ARKSCORE_EERC20_DEMO_ADDRESS,
        },
        {
          key: "EERC20_DEMO_ADDRESS",
          value: combinedEnv.EERC20_DEMO_ADDRESS,
        },
        {
          key: "NEXT_PUBLIC_EERC20_DEMO_ADDRESS",
          value: combinedEnv.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
        },
      ],
      "optional EncryptedERC privacy token demo address",
    ),
    checkAddressPresence(
      "Demo scorer address",
      [
        {
          key: "ARKSCORE_SCORER_ADDRESS",
          value: combinedEnv.ARKSCORE_SCORER_ADDRESS,
        },
        { key: "SCORER_ADDRESS", value: combinedEnv.SCORER_ADDRESS },
      ],
      "required to prove the dashboard signer can store scores on Fuji",
    ),
    checkRailwayAuth(),
    checkVercelAuth(),
  ];

  checks.push(
    await checkUrl(
      "Vercel production URL",
      "https://arkscore-seven.vercel.app",
    ),
  );

  const failed = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  console.log("# ArkScore Readiness Check\n");
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }

  console.log("\n## Summary\n");
  console.log(
    `- Passing: ${checks.filter((check) => check.status === "pass").length}`,
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
        detail: `using ${process.versions.node}`,
      }
    : {
        label: "Node.js runtime",
        status: "fail",
        detail: `expected Node 22.x, found ${process.versions.node}`,
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
  detail: string,
): Check {
  const missing = keys.filter((key) => !hasUsableValue(combinedEnv[key]));

  return missing.length === 0
    ? { label, status: "pass", detail }
    : {
        label,
        status: "warn",
        detail: `${detail}; missing ${missing.join(", ")}`,
      };
}

function checkUrlPresence(
  label: string,
  candidates: Candidate[],
  detail: string,
): Check {
  return checkCandidatePresence(label, candidates, detail, isUrl);
}

function checkAddressPresence(
  label: string,
  candidates: Candidate[],
  detail: string,
): Check {
  return checkCandidatePresence(label, candidates, detail, isAddress);
}

function checkOptionalAddressPresence(
  label: string,
  candidates: Candidate[],
  detail: string,
): Check {
  const usableCandidates = candidates.filter((candidate) =>
    hasUsableValue(candidate.value),
  );
  const validCandidate = usableCandidates.find((candidate) =>
    isAddress(candidate.value ?? ""),
  );

  if (validCandidate) {
    return {
      label,
      status: "pass",
      detail: `${detail}; source ${validCandidate.key}`,
    };
  }

  if (usableCandidates.length === 0) {
    return {
      label,
      status: "pass",
      detail: `${detail}; not configured`,
    };
  }

  return {
    label,
    status: "warn",
    detail: `${detail}; invalid value in ${usableCandidates.map((candidate) => candidate.key).join(", ")}`,
  };
}

function checkCandidatePresence(
  label: string,
  candidates: Candidate[],
  detail: string,
  isValid: (value: string) => boolean,
): Check {
  const usableCandidates = candidates.filter((candidate) =>
    hasUsableValue(candidate.value),
  );
  const validCandidate = usableCandidates.find((candidate) =>
    isValid(candidate.value ?? ""),
  );

  if (validCandidate) {
    return {
      label,
      status: "pass",
      detail: `${detail}; source ${validCandidate.key}`,
    };
  }

  return {
    label,
    status: "warn",
    detail:
      usableCandidates.length > 0
        ? `${detail}; invalid value in ${usableCandidates.map((candidate) => candidate.key).join(", ")}`
        : `${detail}; missing ${candidates.map((candidate) => candidate.key).join(", ")}`,
  };
}

function checkRailwayAuth(): Check {
  const result = spawnSync("pnpm", ["dlx", "@railway/cli", "whoami"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status === 0) {
    return {
      label: "Railway CLI auth",
      status: "pass",
      detail: "authenticated",
    };
  }

  return {
    label: "Railway CLI auth",
    status: "warn",
    detail: "not authenticated; run railway login or provide RAILWAY_TOKEN",
  };
}

function checkVercelAuth(): Check {
  const scope = combinedEnv.VERCEL_SCOPE ?? "feliramis-projects";
  const result = spawnSync(
    "pnpm",
    ["dlx", "vercel", "whoami", "--scope", scope, "--non-interactive"],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  if (result.status === 0) {
    const account = result.stdout.trim() || scope;

    return {
      label: "Vercel CLI auth",
      status: "pass",
      detail: `authenticated for ${account}`,
    };
  }

  return {
    label: "Vercel CLI auth",
    status: "warn",
    detail: `not authenticated for scope ${scope}; run vercel login or provide VERCEL_TOKEN`,
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
      detail: error instanceof Error ? error.message : `could not reach ${url}`,
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
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      }),
  );
}

function readRegistryDeployment(): { address?: string } | undefined {
  const path = "packages/contracts/deployments/fuji/CreditScoreRegistry.json";

  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as { address?: string };
  } catch {
    return undefined;
  }
}

function hasUsableValue(value: string | undefined): boolean {
  return Boolean(
    value &&
    value.trim() &&
    !value.includes("replace_with") &&
    !value.includes("your-") &&
    value !== "0x...",
  );
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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
