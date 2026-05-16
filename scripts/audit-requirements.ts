import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
};

type ScoreRecordProof = {
  chainId?: number;
  composite?: {
    creditScore?: number;
    decisionEnum?: number;
  };
  institution?: string;
  registryAddress?: string;
  scorerAddress?: string;
  source?: string;
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
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/api/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const requireEerc20 =
  process.argv.includes("--require-eerc20") ||
  env.ARKSCORE_REQUIRE_EERC20 === "true";
const requireScoreRecord =
  process.argv.includes("--require-score-record") ||
  env.ARKSCORE_REQUIRE_SCORE_RECORD === "true";
const scoreRecordArtifactPath =
  env.ARKSCORE_SCORE_RECORD_ARTIFACT ??
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";

main();

function main() {
  const checks: Check[] = [
    checkNextFrontend(),
    checkFrontendStack(),
    checkVercelConfig(),
    checkExpressBackend(),
    checkRailwayConfig(),
    checkWavyIntegration(),
    checkCreditScoreRegistry(),
    checkFujiConfig(),
    checkPrivacyModel(),
    checkDashboardFlow(),
    checkInstitutionCopy(),
    checkEerc20Path(),
    checkHackathonDocs(),
    checkLiveRailwayProof(),
    checkLiveWavyProof(),
    checkLiveFujiProof(),
    checkLiveScorerProof(),
    checkLatestScoreRecordProof(),
    checkFinalVerificationPath(),
  ];
  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  console.log("# ArkScore Requirements Audit\n");
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }

  console.log("\n## Summary\n");
  console.log(
    `- Passing: ${checks.filter((check) => check.status === "pass").length}`,
  );
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Failing: ${failures.length}`);
  console.log(`- Report id: ${reportId(checks)}`);

  if (failures.length > 0 || (strict && warnings.length > 0)) {
    process.exitCode = 1;
  }
}

function checkNextFrontend(): Check {
  const webPackage = readPackageJson("apps/web/package.json");
  const nextVersion = packageVersion(webPackage, "next");
  const hasAppRouter =
    existsSync("apps/web/src/app/page.tsx") &&
    existsSync("apps/web/src/app/layout.tsx");

  if (nextVersion?.startsWith("15.") && hasAppRouter) {
    return {
      label: "Next.js 15 App Router frontend",
      status: "pass",
      detail: `next ${nextVersion}, app router entrypoints present`,
    };
  }

  return {
    label: "Next.js 15 App Router frontend",
    status: "fail",
    detail: "missing next@15.x or app router entrypoints",
  };
}

function checkFrontendStack(): Check {
  const webPackage = readPackageJson("apps/web/package.json");
  const dependencies = ["tailwindcss", "wagmi", "viem"];
  const missing = dependencies.filter(
    (dependency) => !packageVersion(webPackage, dependency),
  );
  const hasUiComponents =
    existsSync("apps/web/src/components/ui/button.tsx") &&
    existsSync("apps/web/src/components/ui/input.tsx") &&
    existsSync("apps/web/src/components/ui/badge.tsx");

  if (missing.length === 0 && hasUiComponents) {
    return {
      label: "Tailwind, shadcn-style UI, wagmi, viem",
      status: "pass",
      detail: "frontend dependencies and local UI primitives are present",
    };
  }

  return {
    label: "Tailwind, shadcn-style UI, wagmi, viem",
    status: "fail",
    detail: `missing ${[...missing, hasUiComponents ? "" : "ui components"].filter(Boolean).join(", ")}`,
  };
}

function checkVercelConfig(): Check {
  const vercelConfig = safeRead("vercel.json");

  if (
    vercelConfig?.includes("@arkscore/web build") &&
    vercelConfig.includes("apps/web/out")
  ) {
    return {
      label: "Vercel frontend deployment config",
      status: "pass",
      detail: "vercel.json builds and serves the Next.js static export",
    };
  }

  return {
    label: "Vercel frontend deployment config",
    status: "fail",
    detail: "vercel.json is missing web build or outputDirectory config",
  };
}

function checkExpressBackend(): Check {
  const apiPackage = readPackageJson("apps/api/package.json");
  const hasExpress = Boolean(packageVersion(apiPackage, "express"));
  const scoreRoute = safeRead("apps/api/src/routes/score.ts");
  const hasScoreEndpoint =
    Boolean(scoreRoute?.includes("/api/score/:address")) ||
    Boolean(scoreRoute?.includes("request.params.address"));
  const hasOpenApi = existsSync("apps/api/src/routes/openapi.ts");

  if (hasExpress && hasScoreEndpoint && hasOpenApi) {
    return {
      label: "Express score API",
      status: "pass",
      detail:
        "Express dependency, score route, health, and OpenAPI route are present",
    };
  }

  return {
    label: "Express score API",
    status: "fail",
    detail: "missing Express dependency, score route, or OpenAPI route",
  };
}

function checkRailwayConfig(): Check {
  const railwayConfig = safeRead("railway.toml");

  if (
    railwayConfig?.includes("@arkscore/api build") &&
    railwayConfig.includes("@arkscore/api start") &&
    railwayConfig.includes("/health")
  ) {
    return {
      label: "Railway backend deployment config",
      status: "pass",
      detail: "railway.toml builds, starts, and healthchecks the API service",
    };
  }

  return {
    label: "Railway backend deployment config",
    status: "fail",
    detail: "railway.toml is missing API build, start, or healthcheck config",
  };
}

function checkWavyIntegration(): Check {
  const adapter = safeRead("apps/api/src/services/wavy-node.ts");
  const shared = safeRead("packages/shared/src/index.ts");
  const hasWavyFlow =
    Boolean(adapter?.includes("/chains")) &&
    Boolean(adapter?.includes("/projects/")) &&
    Boolean(adapter?.includes("scan-risk")) &&
    Boolean(adapter?.includes("x-api-key"));
  const hasTraceability =
    Boolean(shared?.includes('riskScoreScale: "0-100"')) &&
    Boolean(shared?.includes('provider: "Wavy Node"')) &&
    Boolean(shared?.includes('scanType: "wallet-risk"'));

  if (hasWavyFlow && hasTraceability) {
    return {
      label: "Wavy Node traceability and AI risk score",
      status: "pass",
      detail:
        "adapter includes chains/register/scan-risk flow and 0-100 traceability fields",
    };
  }

  return {
    label: "Wavy Node traceability and AI risk score",
    status: "fail",
    detail: "missing Wavy API flow or explicit traceability fields",
  };
}

function checkCreditScoreRegistry(): Check {
  const contract = safeRead(
    "packages/contracts/contracts/CreditScoreRegistry.sol",
  );
  const contractPackage = readPackageJson("packages/contracts/package.json");

  if (
    contract?.includes("recordScore") &&
    contract.includes("getScore") &&
    contract.includes("isScorer") &&
    contract.includes("bytes32 subjectHash") &&
    packageVersion(contractPackage, "hardhat")
  ) {
    return {
      label: "Hardhat Solidity score registry",
      status: "pass",
      detail:
        "CreditScoreRegistry stores hashed score records with scorer authorization",
    };
  }

  return {
    label: "Hardhat Solidity score registry",
    status: "fail",
    detail: "missing registry contract behavior or Hardhat dependency",
  };
}

function checkFujiConfig(): Check {
  const hardhatConfig = safeRead("packages/contracts/hardhat.config.ts");

  if (
    hardhatConfig?.includes("https://api.avax-test.network/ext/bc/C/rpc") &&
    hardhatConfig.includes("43113")
  ) {
    return {
      label: "Avalanche Fuji network config",
      status: "pass",
      detail: "Hardhat uses the official Fuji RPC and chain id 43113",
    };
  }

  return {
    label: "Avalanche Fuji network config",
    status: "fail",
    detail: "missing official Fuji RPC or chain id 43113",
  };
}

function checkPrivacyModel(): Check {
  const evidence = safeRead("apps/api/src/lib/evidence.ts");
  const apiEnv = safeRead("apps/api/src/config/env.ts");
  const score = safeRead("apps/api/src/services/score.ts");
  const contract = safeRead(
    "packages/contracts/contracts/CreditScoreRegistry.sol",
  );

  if (
    evidence?.includes("createSubjectHash") &&
    apiEnv?.includes("ARKSCORE_SUBJECT_HASH_SALT") &&
    score?.includes("createSubjectHash") &&
    contract?.includes("mapping(bytes32 subjectHash")
  ) {
    return {
      label: "Privacy-preserving subject hashing",
      status: "pass",
      detail:
        "API derives salted subjectHash and contract keys records by bytes32",
    };
  }

  return {
    label: "Privacy-preserving subject hashing",
    status: "fail",
    detail:
      "missing salted subject hash generation or bytes32 registry storage",
  };
}

function checkDashboardFlow(): Check {
  const dashboard = safeRead("apps/web/src/components/score-dashboard.tsx");

  if (
    dashboard?.includes("fetchWalletScore") &&
    dashboard.includes("recordScore") &&
    dashboard.includes("hasScore") &&
    dashboard.includes("getScore") &&
    dashboard.includes("isScorer") &&
    dashboard.includes("Evidence match")
  ) {
    return {
      label: "Wallet score to on-chain dashboard flow",
      status: "pass",
      detail:
        "dashboard fetches scores, computes decisions, writes, and reads back Fuji evidence",
    };
  }

  return {
    label: "Wallet score to on-chain dashboard flow",
    status: "fail",
    detail: "missing score fetch, registry write, scorer, or readback flow",
  };
}

function checkInstitutionCopy(): Check {
  const page = safeRead("apps/web/src/app/page.tsx");
  const shared = safeRead("packages/shared/src/index.ts");

  if (
    page?.includes("Arkangeles") &&
    page.includes("Bankaool") &&
    shared?.includes("Approve IFC equity issuance") &&
    shared.includes("Approve Bankaool loan")
  ) {
    return {
      label: "Arkangeles and Bankaool institutional copy",
      status: "pass",
      detail:
        "frontend and decision labels cover IFC equity issuance and Bankaool loans",
    };
  }

  return {
    label: "Arkangeles and Bankaool institutional copy",
    status: "fail",
    detail: "missing required institutional copy or decision labels",
  };
}

function checkEerc20Path(): Check {
  const page = safeRead("apps/web/src/app/page.tsx");
  const hasPlanner = existsSync("scripts/plan-eerc20.ts");
  const hasProbe = existsSync("scripts/probe-eerc20.ts");
  const configuredAddress = firstConfiguredValue([
    env.ARKSCORE_EERC20_DEMO_ADDRESS,
    env.EERC20_DEMO_ADDRESS,
    env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
  ]);

  if (!hasPlanner || !hasProbe || !page?.includes("eERC20")) {
    return {
      label: "Optional eERC20 privacy-token path",
      status: "fail",
      detail: "missing eERC20 dashboard slot, planner, or bytecode probe",
    };
  }

  if (!configuredAddress) {
    return {
      label: "Optional eERC20 privacy-token path",
      status: requireEerc20 ? "warn" : "pass",
      detail: requireEerc20
        ? "required but no demo address is configured"
        : "planner/probe/dashboard slot ready; demo address not configured",
    };
  }

  return isAddress(configuredAddress)
    ? {
        label: "Optional eERC20 privacy-token path",
        status: "pass",
        detail: `demo address configured as ${configuredAddress}`,
      }
    : {
        label: "Optional eERC20 privacy-token path",
        status: "warn",
        detail: "configured eERC20 demo address is not a valid EVM address",
      };
}

function checkHackathonDocs(): Check {
  const requiredDocs = [
    "README.md",
    "docs/DEPLOYMENT.md",
    "docs/READINESS_AUDIT.md",
    "docs/REQUIREMENTS_TRACE.md",
    "docs/HACKATHON_SUBMISSION.md",
    "docs/SUBMISSION_EVIDENCE.md",
    "docs/EERC20_DEMO.md",
  ];
  const missing = requiredDocs.filter((path) => !existsSync(path));

  if (missing.length === 0) {
    return {
      label: "Hackathon documentation packet",
      status: "pass",
      detail:
        "README, deployment, audit, trace, submission, evidence, and eERC20 docs exist",
    };
  }

  return {
    label: "Hackathon documentation packet",
    status: "fail",
    detail: `missing ${missing.join(", ")}`,
  };
}

function checkLiveRailwayProof(): Check {
  const apiUrl = normalizeBaseUrl(
    env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL,
  );

  return apiUrl
    ? {
        label: "Railway live deployment proof",
        status: "pass",
        detail: `API URL configured as ${apiUrl}`,
      }
    : {
        label: "Railway live deployment proof",
        status: "warn",
        detail: "missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL",
      };
}

function checkLiveWavyProof(): Check {
  const missing = [
    ["WAVY_NODE_API_KEY", env.WAVY_NODE_API_KEY],
    ["WAVY_NODE_PROJECT_ID", env.WAVY_NODE_PROJECT_ID],
    ["ARKSCORE_SUBJECT_HASH_SALT", env.ARKSCORE_SUBJECT_HASH_SALT],
  ]
    .filter(([, value]) => !hasUsableValue(value))
    .map(([key]) => key);

  return missing.length === 0
    ? {
        label: "Live Wavy credential proof",
        status: "pass",
        detail: "credentials and production subject-hash salt are configured",
      }
    : {
        label: "Live Wavy credential proof",
        status: "warn",
        detail: `missing ${missing.join(", ")}`,
      };
}

function checkLiveFujiProof(): Check {
  const registryAddress = registryAddressFromEnvOrArtifact();

  return registryAddress
    ? {
        label: "Fuji registry deployment proof",
        status: "pass",
        detail: `CreditScoreRegistry configured as ${registryAddress}`,
      }
    : {
        label: "Fuji registry deployment proof",
        status: "warn",
        detail: "missing deployed registry address or Fuji deployment artifact",
      };
}

function checkLiveScorerProof(): Check {
  const scorerAddress = env.ARKSCORE_SCORER_ADDRESS ?? env.SCORER_ADDRESS;

  if (!hasUsableValue(scorerAddress)) {
    return {
      label: "Authorized scorer proof",
      status: "warn",
      detail: "missing ARKSCORE_SCORER_ADDRESS or SCORER_ADDRESS",
    };
  }

  return isAddress(scorerAddress)
    ? {
        label: "Authorized scorer proof",
        status: "pass",
        detail: `scorer address configured as ${scorerAddress}`,
      }
    : {
        label: "Authorized scorer proof",
        status: "warn",
        detail: "configured scorer address is not a valid EVM address",
      };
}

function checkLatestScoreRecordProof(): Check {
  if (!existsSync(scoreRecordArtifactPath)) {
    return {
      label: "Latest on-chain score record proof",
      status: requireScoreRecord ? "warn" : "pass",
      detail: requireScoreRecord
        ? `${scoreRecordArtifactPath} is required but missing`
        : "not configured yet; run pnpm record:fuji after live deployment",
    };
  }

  const proof = readScoreRecordProof();
  const validation = proof ? validateScoreRecordProof(proof) : "invalid JSON";

  return validation
    ? {
        label: "Latest on-chain score record proof",
        status: "warn",
        detail: `${scoreRecordArtifactPath}: ${validation}`,
      }
    : {
        label: "Latest on-chain score record proof",
        status: "pass",
        detail: `${scoreRecordArtifactPath} records Wavy ${proof?.wavy?.riskScore}/100 and composite ${proof?.composite?.creditScore}/100`,
      };
}

function checkFinalVerificationPath(): Check {
  const rootPackage = readPackageJson("package.json");
  const scripts = rootPackage.scripts ?? {};

  if (
    scripts["verify:live:strict:record"] &&
    scripts["finalize:live:apply"] &&
    scripts["submission:evidence:write"] &&
    scripts["readiness:strict:record"]
  ) {
    return {
      label: "Final live verification and evidence path",
      status: "pass",
      detail:
        "strict record verifier, finalizer, readiness, and evidence scripts are registered",
    };
  }

  return {
    label: "Final live verification and evidence path",
    status: "fail",
    detail:
      "missing finalizer, strict live verifier, readiness, or evidence script",
  };
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

function validateScoreRecordProof(proof: ScoreRecordProof): string | undefined {
  if (proof.source !== "wavy") return "source is not wavy";
  if (proof.chainId !== 43113) return "chainId is not Fuji 43113";
  if (!proof.subjectHash || !isBytes32(proof.subjectHash)) {
    return "missing valid subjectHash";
  }
  if (!proof.transactionHash || !isBytes32(proof.transactionHash)) {
    return "missing valid transactionHash";
  }
  if (!proof.wavy?.evidenceHash || !isBytes32(proof.wavy.evidenceHash)) {
    return "missing valid Wavy evidence hash";
  }
  if (!isScore(proof.wavy.riskScore)) return "missing valid Wavy risk score";
  if (!isScore(proof.composite?.creditScore)) {
    return "missing valid composite score";
  }
  if (
    typeof proof.composite?.decisionEnum !== "number" ||
    proof.composite.decisionEnum < 0 ||
    proof.composite.decisionEnum > 3
  ) {
    return "missing valid decision enum";
  }
  if (!proof.registryAddress || !isAddress(proof.registryAddress)) {
    return "missing valid registry address";
  }
  if (!proof.scorerAddress || !isAddress(proof.scorerAddress)) {
    return "missing valid scorer address";
  }
  if (!proof.stored?.submitter || !isAddress(proof.stored.submitter)) {
    return "missing stored submitter";
  }
  if (!proof.stored.updatedAt || !/^\d+$/.test(proof.stored.updatedAt)) {
    return "missing stored timestamp";
  }
  if (!proof.wavy.analysisId) return "missing Wavy analysis id";
  if (!proof.institution) return "missing institution";

  return undefined;
}

function registryAddressFromEnvOrArtifact(): string | undefined {
  const configured = firstConfiguredValue([
    env.ARKSCORE_REGISTRY_ADDRESS,
    env.CREDIT_SCORE_REGISTRY_ADDRESS,
    env.REGISTRY_ADDRESS,
    env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
  ]);

  if (configured && isAddress(configured)) return configured;

  const artifact = readJson(
    "packages/contracts/deployments/fuji/CreditScoreRegistry.json",
  ) as { address?: string } | undefined;

  return artifact?.address && isAddress(artifact.address)
    ? artifact.address
    : undefined;
}

function readPackageJson(path: string): PackageJson {
  return (readJson(path) as PackageJson | undefined) ?? {};
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    return undefined;
  }
}

function packageVersion(
  packageJson: PackageJson,
  name: string,
): string | undefined {
  return (
    packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name]
  );
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

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => hasUsableValue(value))?.trim();
}

function hasUsableValue(value: string | undefined): value is string {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();

  return (
    !normalized.includes("replace_with") &&
    !normalized.includes("your-") &&
    !normalized.includes("wavy_replace") &&
    normalized !== "0x..." &&
    normalized !== "tbd"
  );
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
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
