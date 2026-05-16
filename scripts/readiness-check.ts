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

type ScoreRecordProof = {
  blockNumber?: number | null;
  chainId?: number;
  composite?: {
    creditScore?: number;
    decision?: string;
    decisionEnum?: number;
  };
  generatedAt?: string;
  institution?: string;
  registryAddress?: string;
  scorerAddress?: string;
  source?: "wavy" | "mock";
  stored?: {
    submitter?: string;
    updatedAt?: string;
  };
  subjectHash?: string;
  transactionHash?: string;
  wavy?: {
    analysisId?: string;
    evidenceHash?: string;
    riskScore?: number;
  };
};

const strict = process.argv.includes("--strict");
const defaultScoreRecordArtifactPath =
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";
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
const requireEerc20 =
  process.argv.includes("--require-eerc20") ||
  combinedEnv.ARKSCORE_REQUIRE_EERC20 === "true";
const requireScoreRecord =
  process.argv.includes("--require-score-record") ||
  combinedEnv.ARKSCORE_REQUIRE_SCORE_RECORD === "true";
const skipExternal =
  process.argv.includes("--skip-external") ||
  combinedEnv.ARKSCORE_READINESS_SKIP_EXTERNAL === "true";
const skipCliAuth =
  process.argv.includes("--skip-cli-auth") ||
  combinedEnv.ARKSCORE_READINESS_SKIP_CLI_AUTH === "true";
const allowMockRecord = combinedEnv.ARKSCORE_ALLOW_MOCK_RECORD === "true";
const webUrl =
  normalizeBaseUrl(firstConfiguredValue([combinedEnv.ARKSCORE_WEB_URL])) ??
  "https://arkscore-seven.vercel.app";
const configuredScoreRecordArtifactPath = firstConfiguredValue([
  combinedEnv.ARKSCORE_SCORE_RECORD_ARTIFACT,
]);
const scoreRecordArtifactPath =
  configuredScoreRecordArtifactPath ?? defaultScoreRecordArtifactPath;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const registryCandidates: Candidate[] = [
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
  ];
  const scorerCandidates: Candidate[] = [
    {
      key: "ARKSCORE_SCORER_ADDRESS",
      value: combinedEnv.ARKSCORE_SCORER_ADDRESS,
    },
    { key: "SCORER_ADDRESS", value: combinedEnv.SCORER_ADDRESS },
  ];
  const checks: Check[] = [
    checkNodeVersion(),
    checkFile("apps/web/src/app/page.tsx", "Next.js App Router entry"),
    checkFile("apps/web/.env.local.example", "Frontend public env example"),
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
      registryCandidates,
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
      requireEerc20,
    ),
    checkAddressPresence(
      "Demo scorer address",
      scorerCandidates,
      "required to prove the dashboard signer can store scores on Fuji",
    ),
    checkScoreRecordArtifact(
      findValidCandidate(registryCandidates, isAddress)?.value,
      findValidCandidate(scorerCandidates, isAddress)?.value,
    ),
  ];

  if (skipExternal) {
    checks.push({
      label: "External readiness probes",
      status: "pass",
      detail: "skipped by --skip-external",
    });
  } else {
    if (skipCliAuth) {
      checks.push({
        label: "CLI auth probes",
        status: "pass",
        detail: "skipped by --skip-cli-auth",
      });
    } else {
      checks.push(checkRailwayAuth(), checkVercelAuth());
    }

    checks.push(await checkUrl("Vercel production URL", webUrl));
  }

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
  required = false,
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
      status: required ? "warn" : "pass",
      detail: required
        ? `${detail}; required by ARKSCORE_REQUIRE_EERC20=true; missing ${candidates.map((candidate) => candidate.key).join(", ")}`
        : `${detail}; not configured`,
    };
  }

  return {
    label,
    status: "warn",
    detail: `${detail}; invalid value in ${usableCandidates.map((candidate) => candidate.key).join(", ")}`,
  };
}

function checkScoreRecordArtifact(
  configuredRegistryAddress?: string,
  configuredScorerAddress?: string,
): Check {
  const artifactConfigured =
    hasUsableValue(configuredScoreRecordArtifactPath) &&
    isCustomScoreRecordArtifactPath(configuredScoreRecordArtifactPath);

  if (!existsSync(scoreRecordArtifactPath)) {
    if (!requireScoreRecord && !artifactConfigured) {
      return {
        label: "Latest Fuji score record",
        status: "pass",
        detail:
          "not configured yet; run pnpm record:fuji for final submission proof",
      };
    }

    return {
      label: "Latest Fuji score record",
      status: "warn",
      detail: `${scoreRecordArtifactPath} is missing; run pnpm record:fuji first`,
    };
  }

  const proof = readScoreRecordProof();
  if (!proof) {
    return {
      label: "Latest Fuji score record",
      status: "warn",
      detail: `${scoreRecordArtifactPath} is not valid JSON`,
    };
  }

  const validationError = validateScoreRecordProof(
    proof,
    configuredRegistryAddress,
    configuredScorerAddress,
  );

  if (validationError) {
    return {
      label: "Latest Fuji score record",
      status: "warn",
      detail: validationError,
    };
  }

  return {
    label: "Latest Fuji score record",
    status: "pass",
    detail: `${scoreRecordArtifactPath} records Wavy ${proof.wavy?.riskScore}/100, composite ${proof.composite?.creditScore}/100, tx ${proof.transactionHash}`,
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

function findValidCandidate(
  candidates: Candidate[],
  isValid: (value: string) => boolean,
): Candidate | undefined {
  return candidates.find(
    (candidate) =>
      hasUsableValue(candidate.value) && isValid(candidate.value ?? ""),
  );
}

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function isCustomScoreRecordArtifactPath(value: string | undefined) {
  if (!value) return false;
  return normalizeRelativePath(value) !== defaultScoreRecordArtifactPath;
}

function normalizeRelativePath(value: string) {
  return value.trim().replaceAll("\\", "/").replace(/^\.\//, "");
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
    detail:
      "not authenticated; run pnpm railway:login, pnpm railway:login:browserless, or provide RAILWAY_TOKEN",
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

function readScoreRecordProof(): ScoreRecordProof | undefined {
  try {
    return JSON.parse(readFileSync(scoreRecordArtifactPath, "utf8")) as
      | ScoreRecordProof
      | undefined;
  } catch {
    return undefined;
  }
}

function validateScoreRecordProof(
  proof: ScoreRecordProof,
  configuredRegistryAddress?: string,
  configuredScorerAddress?: string,
): string | undefined {
  if (!proof.registryAddress || !isAddress(proof.registryAddress)) {
    return `${scoreRecordArtifactPath} is missing a valid registryAddress`;
  }

  if (
    configuredRegistryAddress &&
    proof.registryAddress.toLowerCase() !==
      configuredRegistryAddress.toLowerCase()
  ) {
    return `${scoreRecordArtifactPath} registryAddress does not match the configured registry`;
  }

  if (!proof.scorerAddress || !isAddress(proof.scorerAddress)) {
    return `${scoreRecordArtifactPath} is missing a valid scorerAddress`;
  }

  if (
    configuredScorerAddress &&
    proof.scorerAddress.toLowerCase() !== configuredScorerAddress.toLowerCase()
  ) {
    return `${scoreRecordArtifactPath} scorerAddress does not match the configured scorer`;
  }

  if (!proof.subjectHash || !isBytes32(proof.subjectHash)) {
    return `${scoreRecordArtifactPath} is missing a valid subjectHash`;
  }

  if (!proof.wavy?.evidenceHash || !isBytes32(proof.wavy.evidenceHash)) {
    return `${scoreRecordArtifactPath} is missing a valid Wavy evidence hash`;
  }

  if (!proof.transactionHash || !isBytes32(proof.transactionHash)) {
    return `${scoreRecordArtifactPath} is missing a valid transaction hash`;
  }

  if (!isScore(proof.wavy.riskScore)) {
    return `${scoreRecordArtifactPath} is missing a valid Wavy risk score`;
  }

  if (!isScore(proof.composite?.creditScore)) {
    return `${scoreRecordArtifactPath} is missing a valid composite score`;
  }

  if (
    typeof proof.composite?.decisionEnum !== "number" ||
    proof.composite.decisionEnum < 0 ||
    proof.composite.decisionEnum > 3
  ) {
    return `${scoreRecordArtifactPath} is missing a valid decision enum`;
  }

  if (!proof.wavy.analysisId) {
    return `${scoreRecordArtifactPath} is missing the Wavy analysis id`;
  }

  if (!proof.institution) {
    return `${scoreRecordArtifactPath} is missing the institution`;
  }

  if (!proof.stored?.submitter || !isAddress(proof.stored.submitter)) {
    return `${scoreRecordArtifactPath} is missing the stored submitter`;
  }

  if (
    proof.stored.submitter.toLowerCase() !== proof.scorerAddress.toLowerCase()
  ) {
    return `${scoreRecordArtifactPath} stored submitter does not match scorerAddress`;
  }

  if (!proof.stored.updatedAt || !/^\d+$/.test(proof.stored.updatedAt)) {
    return `${scoreRecordArtifactPath} is missing the stored update timestamp`;
  }

  if (!allowMockRecord && proof.source !== "wavy") {
    return `${scoreRecordArtifactPath} source is ${proof.source ?? "unknown"}, expected wavy`;
  }

  if (proof.chainId !== 43113) {
    return `${scoreRecordArtifactPath} chainId is ${proof.chainId ?? "unknown"}, expected 43113`;
  }

  return undefined;
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

function isBytes32(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isScore(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 100;
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
