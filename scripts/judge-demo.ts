import { existsSync, readFileSync } from "node:fs";

type ScoreRecordProof = {
  apiUrl?: string;
  chainId?: number;
  composite?: {
    creditScore?: number;
    decision?: string;
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

type ScoreRecordEvidence = {
  error?: string;
  exists: boolean;
  path: string;
  proof?: ScoreRecordProof;
};

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const defaultScoreRecordArtifactPath =
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/api/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const webUrl = normalizeBaseUrl(
  env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app",
);
const apiUrlCandidates = [env.ARKSCORE_API_URL, env.NEXT_PUBLIC_API_BASE_URL];
const configuredApiUrl = firstConfiguredValue(apiUrlCandidates);
const apiUrl = firstPublicHttpsUrl(apiUrlCandidates);
const registryAddress =
  firstConfiguredValue([
    env.ARKSCORE_REGISTRY_ADDRESS,
    env.CREDIT_SCORE_REGISTRY_ADDRESS,
    env.REGISTRY_ADDRESS,
    env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
  ]) ?? readRegistryDeployment()?.address;
const eerc20Address = firstConfiguredValue([
  env.ARKSCORE_EERC20_DEMO_ADDRESS,
  env.EERC20_DEMO_ADDRESS,
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
]);
const scorerAddress = firstConfiguredValue([
  env.ARKSCORE_SCORER_ADDRESS,
  env.SCORER_ADDRESS,
]);
const scoreRecordArtifactPath =
  firstConfiguredValue([env.ARKSCORE_SCORE_RECORD_ARTIFACT]) ??
  defaultScoreRecordArtifactPath;

main();

function main() {
  const liveApiReady = Boolean(apiUrl);
  const registryReady = Boolean(registryAddress && isAddress(registryAddress));
  const scorerReady = Boolean(scorerAddress && isAddress(scorerAddress));
  const scoreRecordEvidence = readScoreRecordEvidence({
    registryAddress: registryReady ? registryAddress : undefined,
    scorerAddress: scorerReady ? scorerAddress : undefined,
  });
  const scoreRecordReady = Boolean(
    scoreRecordEvidence.exists && !scoreRecordEvidence.error,
  );
  const eerc20Ready = Boolean(eerc20Address && isAddress(eerc20Address));
  const liveModeReady =
    liveApiReady && registryReady && scorerReady && scoreRecordReady;
  const blockers = currentBlockers({
    liveApiReady,
    apiUrlConfigured: Boolean(configuredApiUrl),
    registryReady,
    scorerReady,
    scoreRecordError: scoreRecordEvidence.error,
    scoreRecordExists: scoreRecordEvidence.exists,
    scoreRecordReady,
  });

  console.log("# ArkScore Judge Demo Runbook\n");
  console.log("## Current Mode\n");
  console.log(`- Frontend: ${webUrl}`);
  console.log(
    `- Score source: ${liveApiReady ? `Railway API at ${apiUrl}` : "hosted fallback demo until Railway/Wavy credentials are configured"}`,
  );
  console.log(
    `- Fuji registry: ${registryReady ? registryAddress : "not configured yet"}`,
  );
  console.log(
    `- Authorized scorer: ${scorerReady ? scorerAddress : "not configured yet"}`,
  );
  console.log(
    `- Latest score record proof: ${scoreRecordReady ? scoreRecordArtifactPath : scoreRecordEvidence.exists ? `${scoreRecordArtifactPath} is not valid final proof` : "not recorded yet"}`,
  );
  console.log(
    `- Optional eERC20: ${eerc20Ready ? eerc20Address : "not configured"}`,
  );
  console.log(
    `- Demo posture: ${liveModeReady ? "final live oracle proof path" : "judge-usable fallback with live proof blockers listed below"}`,
  );

  console.log("\n## Three-Minute Walkthrough\n");
  console.log(`1. Open ${webUrl}.`);
  console.log("2. Connect an Avalanche Fuji wallet.");
  console.log(
    `3. Keep the demo wallet ${demoWallet}, or paste any EVM wallet.`,
  );
  console.log(
    "4. Select Arkangeles, fetch the score, and point to Wavy risk, traceability, subject hash, evidence hash, composite score, and IFC equity issuance decision.",
  );
  console.log(
    "5. Switch to Bankaool, fetch again, and point to the credit-underwriting decision and changed institutional threshold.",
  );
  console.log(
    registryReady
      ? "6. With an authorized scorer wallet, store or update the subject score on Fuji and show the on-chain readback plus evidence match badge."
      : "6. Show the disabled Store on Fuji path and explain that the registry address is published during the final Fuji deployment.",
  );
  console.log(
    eerc20Ready
      ? "7. Open the eERC20 Fuji address from the privacy-token card and show that the optional EncryptedERC demo is configured."
      : "7. Show the eERC20 privacy-token card as the optional EncryptedERC deployment slot.",
  );

  console.log("\n## Proof Commands\n");
  console.log("```bash");
  console.log("pnpm smoke:web");
  console.log("pnpm audit:requirements");
  console.log("pnpm readiness");
  console.log("pnpm verify:live");
  if (!liveModeReady) {
    console.log("pnpm probe:wavy");
    console.log("pnpm probe:fuji");
    console.log("pnpm plan:eerc20");
    console.log(eerc20Ready ? "pnpm probe:eerc20:strict" : "pnpm probe:eerc20");
    console.log("pnpm railway:whoami");
    console.log("pnpm verify:railway");
    console.log("pnpm deploy:railway:apply -- --create-domain");
    console.log(
      "export ARKSCORE_API_URL=https://your-railway-api.up.railway.app",
    );
    console.log("pnpm verify:railway:live");
    console.log("pnpm --filter @arkscore/contracts deploy:fuji");
    console.log("export ARKSCORE_REGISTRY_ADDRESS=0x...");
    console.log("export ARKSCORE_SCORER_ADDRESS=0x...");
    console.log("pnpm --filter @arkscore/contracts scorer:fuji");
    console.log("pnpm record:fuji");
    console.log("pnpm readiness:strict:record");
    console.log("pnpm verify:live:preflight");
    console.log("pnpm finalize:live:apply");
  }
  console.log(
    eerc20Ready
      ? "ARKSCORE_REQUIRE_EERC20=true pnpm verify:live:strict:eerc20:record"
      : "pnpm verify:live:strict:record",
  );
  console.log("```\n");

  console.log("## Current Blockers\n");
  if (blockers.length === 0) {
    console.log("- None detected by local configuration.");
  } else {
    for (const blocker of blockers) console.log(`- ${blocker}`);
  }
}

function currentBlockers(input: {
  liveApiReady: boolean;
  apiUrlConfigured: boolean;
  registryReady: boolean;
  scorerReady: boolean;
  scoreRecordError?: string;
  scoreRecordExists: boolean;
  scoreRecordReady: boolean;
}) {
  const blockers: string[] = [];

  if (!input.liveApiReady) {
    blockers.push(
      input.apiUrlConfigured
        ? "Railway API URL must be a public HTTPS URL."
        : "Railway API URL is missing.",
    );
  }

  if (!hasUsableValue(env.WAVY_NODE_API_KEY)) {
    blockers.push("WAVY_NODE_API_KEY is missing.");
  }

  if (!hasUsableValue(env.WAVY_NODE_PROJECT_ID)) {
    blockers.push("WAVY_NODE_PROJECT_ID is missing.");
  }

  if (!hasUsableValue(env.ARKSCORE_SUBJECT_HASH_SALT)) {
    blockers.push("ARKSCORE_SUBJECT_HASH_SALT is missing.");
  }

  if (!hasUsableValue(env.FUJI_PRIVATE_KEY)) {
    blockers.push("FUJI_PRIVATE_KEY is missing.");
  }

  if (!input.registryReady) {
    blockers.push("Fuji CreditScoreRegistry address is missing.");
  }

  if (!input.scorerReady) {
    blockers.push("Authorized scorer address is missing.");
  }

  if (!input.scoreRecordReady && input.scoreRecordExists) {
    blockers.push(
      `Latest Fuji score record artifact is invalid: ${input.scoreRecordError ?? "validation failed"}`,
    );
  } else if (!input.scoreRecordReady) {
    blockers.push("Latest Fuji score record artifact is missing.");
  }

  return blockers;
}

function readScoreRecordEvidence(input: {
  registryAddress?: string;
  scorerAddress?: string;
}): ScoreRecordEvidence {
  if (!existsSync(scoreRecordArtifactPath)) {
    return { exists: false, path: scoreRecordArtifactPath };
  }

  try {
    const proof = JSON.parse(
      readFileSync(scoreRecordArtifactPath, "utf8"),
    ) as ScoreRecordProof;
    const error = validateScoreRecordProof(proof, input);

    return {
      error,
      exists: true,
      path: scoreRecordArtifactPath,
      proof,
    };
  } catch (error) {
    return {
      error: `invalid JSON: ${error instanceof Error ? error.message : "parse failed"}`,
      exists: true,
      path: scoreRecordArtifactPath,
    };
  }
}

function validateScoreRecordProof(
  proof: ScoreRecordProof,
  input: { registryAddress?: string; scorerAddress?: string },
) {
  if (proof.source !== "wavy") {
    return `source is ${proof.source ?? "unknown"}, expected wavy`;
  }

  if (proof.chainId !== 43113) {
    return `chainId is ${proof.chainId ?? "unknown"}, expected 43113`;
  }

  if (!proof.apiUrl || !isPublicHttpsUrl(proof.apiUrl)) {
    return "missing a public HTTPS Railway apiUrl";
  }

  if (!proof.registryAddress || !isAddress(proof.registryAddress)) {
    return "missing a valid registryAddress";
  }

  if (
    input.registryAddress &&
    proof.registryAddress.toLowerCase() !== input.registryAddress.toLowerCase()
  ) {
    return "registryAddress does not match configured registry";
  }

  if (!proof.scorerAddress || !isAddress(proof.scorerAddress)) {
    return "missing a valid scorerAddress";
  }

  if (
    input.scorerAddress &&
    proof.scorerAddress.toLowerCase() !== input.scorerAddress.toLowerCase()
  ) {
    return "scorerAddress does not match configured scorer";
  }

  if (!proof.subjectHash || !isBytes32(proof.subjectHash)) {
    return "missing a valid subjectHash";
  }

  if (!proof.transactionHash || !isBytes32(proof.transactionHash)) {
    return "missing a valid transactionHash";
  }

  if (!proof.wavy?.evidenceHash || !isBytes32(proof.wavy.evidenceHash)) {
    return "missing a valid Wavy evidence hash";
  }

  if (!isScore(proof.wavy.riskScore)) {
    return "missing a valid Wavy risk score";
  }

  if (!proof.wavy.analysisId) {
    return "missing the Wavy analysis id";
  }

  if (!isScore(proof.composite?.creditScore)) {
    return "missing a valid composite score";
  }

  if (
    typeof proof.composite?.decisionEnum !== "number" ||
    proof.composite.decisionEnum < 0 ||
    proof.composite.decisionEnum > 3
  ) {
    return "missing a valid decision enum";
  }

  if (!proof.composite.decision) {
    return "missing the institutional decision";
  }

  if (!proof.institution) {
    return "missing the institution";
  }

  if (!proof.stored?.submitter || !isAddress(proof.stored.submitter)) {
    return "missing the stored submitter";
  }

  if (
    proof.stored.submitter.toLowerCase() !== proof.scorerAddress.toLowerCase()
  ) {
    return "stored submitter does not match scorerAddress";
  }

  if (!proof.stored.updatedAt || !/^\d+$/.test(proof.stored.updatedAt)) {
    return "missing the stored update timestamp";
  }

  return undefined;
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

function normalizeBaseUrl(value: string | undefined): string {
  return (value?.trim() || "https://arkscore-seven.vercel.app").replace(
    /\/$/,
    "",
  );
}

function firstPublicHttpsUrl(values: Array<string | undefined>) {
  const value = values.find((candidate) => {
    if (!hasUsableValue(candidate)) return false;
    return isPublicHttpsUrl(candidate.trim());
  });

  return value?.trim().replace(/\/$/, "");
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && !isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    value === "localhost" ||
    value === "::1" ||
    value.endsWith(".local") ||
    value === "0.0.0.0" ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^169\.254\./.test(value)
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
