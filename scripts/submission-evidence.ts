import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import process from "node:process";

type CommandResult = {
  label: string;
  command: string;
  exitCode: number;
  output: string;
};

type ShellResult = {
  exitCode: number;
  output: string;
};

type DeploymentTargets = {
  apiUrl?: string;
  eerc20DemoAddress?: string;
  registryAddress?: string;
  webUrl: string;
};

type ScoreSnapshot = {
  address?: string;
  subjectHash?: string;
  chainId?: number;
  institution?: string;
  source?: string;
  generatedAt?: string;
  evidenceHash?: string;
  wavy?: Record<string, unknown>;
  composite?: Record<string, unknown>;
};

type ScoreRecordProof = {
  apiUrl?: string;
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
  requestedWallet?: string;
  score?: ScoreSnapshot;
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

type ReportInput = {
  generatedAt: string;
  gitCommit: string;
  gitBranch: string;
  gitStatus: string;
  checkResults: CommandResult[];
  deploymentTargets: DeploymentTargets;
  scoreRecordEvidence: ScoreRecordEvidence;
  requireEerc20: boolean;
};

const defaultScoreRecordArtifactPath =
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";
const scoreRecordSnapshotMaxAgeMs = 15 * 60 * 1000;
const scoreRecordSnapshotFutureSkewMs = 60 * 1000;
const args = new Set(process.argv.slice(2));
const shouldWrite = args.has("--write");
const skipChecks = args.has("--skip-checks");
const includeVerify = args.has("--include-verify");
const outputPath =
  readArgValue("--output") ??
  join(process.cwd(), "docs", "SUBMISSION_EVIDENCE.md");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/api/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};

main();

function main() {
  const generatedAt = new Date().toISOString();
  const gitCommit = commandText("git", ["rev-parse", "--short", "HEAD"]);
  const gitBranch = commandText("git", ["branch", "--show-current"]);
  const gitStatus = gitStatusWithoutOutput(outputPath);
  const checkResults = skipChecks ? [] : runChecks();
  const scoreRecordEvidence = readScoreRecordEvidence();
  const markdown = renderReport({
    generatedAt,
    gitCommit,
    gitBranch,
    gitStatus,
    checkResults,
    deploymentTargets: getDeploymentTargets(),
    scoreRecordEvidence,
    requireEerc20: env.ARKSCORE_REQUIRE_EERC20 === "true",
  });

  if (shouldWrite) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, markdown);
    console.log(`Wrote ${outputPath}`);
  } else {
    process.stdout.write(markdown);
  }

  const failedChecks = checkResults.filter((result) => result.exitCode !== 0);
  if (failedChecks.length > 0 || scoreRecordEvidence.error) {
    process.exitCode = 1;
  }
}

function runChecks(): CommandResult[] {
  const checks = [
    ...(includeVerify
      ? [{ label: "Full repo verification", command: "pnpm --silent verify" }]
      : []),
    {
      label: "Railway archive verifier",
      command: "pnpm --silent verify:railway",
    },
    { label: "Hosted demo smoke", command: "pnpm --silent smoke:web" },
    {
      label: "Live deployment verifier",
      command: "pnpm --silent verify:live",
    },
    {
      label: "Requirements audit",
      command: "pnpm --silent audit:requirements",
    },
    {
      label: "Judge demo runbook",
      command: "pnpm --silent judge:demo",
    },
    { label: "Readiness gate", command: "pnpm --silent readiness" },
  ];

  return checks.map((check) => {
    const [executable, ...commandArgs] = check.command.split(" ");
    const result = runCommand(executable!, commandArgs);

    return {
      ...check,
      exitCode: result.exitCode,
      output: result.output,
    };
  });
}

function renderReport(input: ReportInput) {
  const checkSummary =
    input.checkResults.length === 0
      ? "- Checks skipped with `--skip-checks`."
      : input.checkResults
          .map(
            (result) =>
              `- ${result.exitCode === 0 ? "PASS" : "FAIL"}: ${result.label} (\`${result.command}\`)`,
          )
          .join("\n");

  const checkDetails =
    input.checkResults.length === 0
      ? ""
      : `\n## Check Output\n\n${input.checkResults
          .map(
            (result) => `### ${result.label}

- Command: \`${result.command}\`
- Exit code: \`${result.exitCode}\`

\`\`\`\`text
${result.output.trim() || "(no output)"}
\`\`\`\``,
          )
          .join("\n\n")}\n`;
  const worktreeDetails = input.gitStatus
    ? `\n\n\`\`\`text\n${input.gitStatus}\n\`\`\``
    : "";

  return `# ArkScore Submission Evidence

Generated: ${input.generatedAt}

## Repository Snapshot

- Branch: \`${input.gitBranch || "unknown"}\`
- Commit: \`${input.gitCommit || "unknown"}\`
- Worktree: ${input.gitStatus ? "dirty when report was generated" : "clean when report was generated"}${worktreeDetails}

## Deployment Targets

- Vercel frontend: ${input.deploymentTargets.webUrl}
- Railway backend: ${renderUrlOrTbd(input.deploymentTargets.apiUrl, "TBD until Railway auth and Wavy credentials are configured")}
- Avalanche Fuji \`CreditScoreRegistry\`: ${renderAddressOrTbd(input.deploymentTargets.registryAddress, "TBD until FUJI_PRIVATE_KEY is funded and deployed")}
- Optional eERC20 demo contract: ${renderAddressOrTbd(input.deploymentTargets.eerc20DemoAddress, "TBD unless the EncryptedERC demo is deployed")}
${renderScoreRecordProof(input.scoreRecordEvidence)}

## Evidence Summary

${checkSummary}

## Current Scope Status

- Frontend dashboard: production-hosted demo fallback is public and judge-usable.
- Backend API: Railway-ready Express service is built and tested locally, including a pruned Railway archive verifier, but live deployment still needs Railway auth and Wavy credentials.
- Wavy Node: live adapter and probe tooling are present; live proof needs \`WAVY_NODE_API_KEY\` and \`WAVY_NODE_PROJECT_ID\`.
- Fuji registry: Solidity contract and scripts are ready; live proof needs funded \`FUJI_PRIVATE_KEY\`, deployed registry address, and authorized scorer wallet.
- Privacy model: API returns a backend-derived \`subjectHash\`; the contract stores hashed subjects, evidence hashes, Wavy analysis ids, and institutional decisions instead of raw scored wallets.

## Final Handoff Commands

\`\`\`bash
${renderFinalHandoffCommands(input.requireEerc20)}
\`\`\`
${checkDetails}`;
}

function renderFinalHandoffCommands(requireEerc20: boolean) {
  const eerc20ProbeCommand = requireEerc20
    ? "pnpm probe:eerc20:strict"
    : "pnpm probe:eerc20";
  const readinessCommand = requireEerc20
    ? "ARKSCORE_REQUIRE_EERC20=true pnpm readiness:strict:record"
    : "pnpm readiness:strict:record";
  const verifyCommand = requireEerc20
    ? "pnpm verify:live:strict:eerc20:record"
    : "pnpm verify:live:strict:record";
  const eerc20Exports = requireEerc20
    ? [
        "export ARKSCORE_EERC20_DEMO_ADDRESS=0x...",
        "export ARKSCORE_REQUIRE_EERC20=true",
      ]
    : [];

  return [
    "pnpm probe:wavy",
    "pnpm probe:fuji",
    "pnpm plan:eerc20",
    eerc20ProbeCommand,
    "pnpm railway:whoami",
    "pnpm verify:railway",
    "pnpm deploy:railway:apply -- --create-domain",
    "# If deploy:railway:apply did not print and verify a generated API URL, export it manually.",
    "export ARKSCORE_API_URL=https://your-railway-api.up.railway.app",
    "pnpm verify:railway:live",
    "pnpm --filter @arkscore/contracts deploy:fuji",
    "export ARKSCORE_REGISTRY_ADDRESS=0x...",
    "export ARKSCORE_SCORER_ADDRESS=0x...",
    "# If the scorer is not the FUJI_PRIVATE_KEY deployer, set ARKSCORE_SCORER_PRIVATE_KEY.",
    ...eerc20Exports,
    "pnpm --filter @arkscore/contracts scorer:fuji",
    "pnpm record:fuji",
    readinessCommand,
    "pnpm verify:live:preflight",
    "pnpm finalize:live:apply",
    verifyCommand,
  ].join("\n");
}

function commandText(command: string, commandArgs: string[]) {
  return runCommand(command, commandArgs).output.trim();
}

function gitStatusWithoutOutput(path: string) {
  const ignoredPath = normalizePath(relative(process.cwd(), path));
  const result = spawnSync("git", ["status", "--short"], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  const status = stripAnsi(
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );

  return status
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .filter((line) => !isStatusForPath(line, ignoredPath))
    .join("\n");
}

function isStatusForPath(line: string, path: string) {
  const statusPath = normalizePath(line.replace(/^.. /, "").trim());

  return statusPath === path || statusPath.endsWith(` -> ${path}`);
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}

function runCommand(command: string, commandArgs: string[]): ShellResult {
  const result = spawnSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: process.env,
  });
  const output = stripAnsi(
    [result.stdout, result.stderr].filter(Boolean).join("\n"),
  );

  return {
    exitCode:
      typeof result.status === "number" ? result.status : result.error ? 1 : 0,
    output:
      output.trim() ||
      (result.error instanceof Error ? result.error.message : ""),
  };
}

function readArgValue(name: string) {
  const exactPrefix = `${name}=`;
  const value = process.argv
    .slice(2)
    .find((entry) => entry.startsWith(exactPrefix));

  return value?.slice(exactPrefix.length);
}

function getDeploymentTargets(): DeploymentTargets {
  return {
    webUrl:
      normalizeBaseUrl(env.ARKSCORE_WEB_URL) ??
      "https://arkscore-seven.vercel.app",
    apiUrl: firstPublicHttpsUrl([
      env.ARKSCORE_API_URL,
      env.NEXT_PUBLIC_API_BASE_URL,
    ]),
    registryAddress: firstValidAddress([
      env.ARKSCORE_REGISTRY_ADDRESS,
      env.CREDIT_SCORE_REGISTRY_ADDRESS,
      env.REGISTRY_ADDRESS,
      env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
      readRegistryDeployment()?.address,
    ]),
    eerc20DemoAddress: firstValidAddress([
      env.ARKSCORE_EERC20_DEMO_ADDRESS,
      env.EERC20_DEMO_ADDRESS,
      env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
    ]),
  };
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

function readScoreRecordEvidence(): ScoreRecordEvidence {
  const path =
    firstConfiguredValue([env.ARKSCORE_SCORE_RECORD_ARTIFACT]) ??
    defaultScoreRecordArtifactPath;

  if (!existsSync(path)) return { exists: false, path };

  try {
    const proof = JSON.parse(readFileSync(path, "utf8")) as ScoreRecordProof;
    const error = validateScoreRecordProof(proof);

    return { error, exists: true, path, proof };
  } catch (error) {
    return {
      error: `invalid JSON: ${error instanceof Error ? error.message : "parse failed"}`,
      exists: true,
      path,
    };
  }
}

function firstValidAddress(values: Array<string | undefined>) {
  return values.find((value) => value && isAddress(value));
}

function firstPublicHttpsUrl(values: Array<string | undefined>) {
  return values
    .map((value) => normalizeBaseUrl(value))
    .find((value): value is string =>
      Boolean(value && isPublicHttpsUrl(value)),
    );
}

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
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

function renderUrlOrTbd(value: string | undefined, fallback: string) {
  return value ? value : `\`${fallback}\``;
}

function renderAddressOrTbd(value: string | undefined, fallback: string) {
  return value ? `\`${value}\`` : `\`${fallback}\``;
}

function renderScoreRecordProof(evidence: ScoreRecordEvidence) {
  if (!evidence.exists) {
    return "- Latest Fuji score record: `TBD until pnpm record:fuji writes LatestScoreRecord.json`";
  }

  if (evidence.error || !evidence.proof) {
    return `- Latest Fuji score record: \`invalid at ${evidence.path}: ${evidence.error ?? "validation failed"}; run pnpm record:fuji\``;
  }

  const { proof } = evidence;

  return [
    "- Latest Fuji score record:",
    `  - Transaction: \`${proof.transactionHash ?? "unknown"}\``,
    `  - Block: \`${proof.blockNumber ?? "unknown"}\``,
    `  - Subject hash: \`${proof.subjectHash ?? "unknown"}\``,
    `  - Evidence hash: \`${proof.wavy?.evidenceHash ?? "unknown"}\``,
    `  - Score generatedAt: \`${proof.score?.generatedAt ?? "unknown"}\``,
    `  - Record artifact generatedAt: \`${proof.generatedAt ?? "unknown"}\``,
    `  - Wavy analysis id: \`${proof.wavy?.analysisId ?? "unknown"}\``,
    `  - Scores: Wavy \`${proof.wavy?.riskScore ?? "unknown"}/100\`, composite \`${proof.composite?.creditScore ?? "unknown"}/100\``,
    `  - Decision: \`${proof.composite?.decision ?? "unknown"}\` for \`${proof.institution ?? "unknown"}\``,
    `  - Source: \`${proof.source ?? "unknown"}\` on chain \`${proof.chainId ?? "unknown"}\``,
  ].join("\n");
}

function validateScoreRecordProof(proof: ScoreRecordProof): string | undefined {
  if (proof.source !== "wavy") {
    return `source is ${proof.source ?? "unknown"}, expected wavy`;
  }

  if (proof.chainId !== 43113) {
    return `chainId is ${proof.chainId ?? "unknown"}, expected 43113`;
  }

  const scoreSnapshotError = validateScoreRecordSnapshot(proof);
  if (scoreSnapshotError) {
    return scoreSnapshotError;
  }

  if (!proof.apiUrl || !isPublicHttpsUrl(proof.apiUrl)) {
    return "missing a public HTTPS Railway apiUrl";
  }

  if (!proof.registryAddress || !isAddress(proof.registryAddress)) {
    return "missing a valid registryAddress";
  }

  if (!proof.scorerAddress || !isAddress(proof.scorerAddress)) {
    return "missing a valid scorerAddress";
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

  if (!proof.composite?.decision) {
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

function validateScoreRecordSnapshot(
  proof: ScoreRecordProof,
): string | undefined {
  const score = proof.score;

  if (!score || typeof score !== "object") {
    return "missing the exact score snapshot used for the Fuji write";
  }
  if (!score.address || !isAddress(score.address)) {
    return "score snapshot is missing a valid address";
  }
  if (
    proof.requestedWallet &&
    isAddress(proof.requestedWallet) &&
    score.address.toLowerCase() !== proof.requestedWallet.toLowerCase()
  ) {
    return "score snapshot address does not match requestedWallet";
  }
  if (score.subjectHash?.toLowerCase() !== proof.subjectHash?.toLowerCase()) {
    return "score snapshot subjectHash does not match record proof";
  }
  if (score.chainId !== proof.chainId) {
    return "score snapshot chainId does not match record proof";
  }
  if (score.institution !== proof.institution) {
    return "score snapshot institution does not match record proof";
  }
  if (score.source !== proof.source) {
    return "score snapshot source does not match record proof";
  }
  if (!score.generatedAt || !isValidDateTime(score.generatedAt)) {
    return "score snapshot is missing a valid generatedAt";
  }
  const timestampError = validateScoreRecordSnapshotTime(proof, score);
  if (timestampError) {
    return timestampError;
  }
  if (!score.evidenceHash || !isBytes32(score.evidenceHash)) {
    return "score snapshot is missing a valid evidenceHash";
  }
  if (
    score.evidenceHash.toLowerCase() !== proof.wavy?.evidenceHash?.toLowerCase()
  ) {
    return "score snapshot evidenceHash does not match record proof";
  }
  if (!score.wavy || !score.composite) {
    return "score snapshot is missing Wavy or composite payloads";
  }

  const expected = createEvidenceHash({
    address: score.address,
    subjectHash: score.subjectHash,
    chainId: score.chainId,
    institution: score.institution,
    source: score.source,
    generatedAt: score.generatedAt,
    wavy: score.wavy,
    composite: score.composite,
  });

  if (score.evidenceHash.toLowerCase() !== expected) {
    return "score snapshot evidenceHash does not match its generatedAt-bound payload";
  }

  return undefined;
}

function validateScoreRecordSnapshotTime(
  proof: ScoreRecordProof,
  score: ScoreSnapshot,
): string | undefined {
  if (!proof.generatedAt || !isValidDateTime(proof.generatedAt)) {
    return "missing a valid record artifact generatedAt";
  }

  const artifactGeneratedAtMs = Date.parse(proof.generatedAt);
  const scoreGeneratedAtMs = Date.parse(score.generatedAt ?? "");

  if (
    scoreGeneratedAtMs >
    artifactGeneratedAtMs + scoreRecordSnapshotFutureSkewMs
  ) {
    return "score snapshot generatedAt is after the record artifact timestamp";
  }

  if (
    artifactGeneratedAtMs - scoreGeneratedAtMs >
    scoreRecordSnapshotMaxAgeMs
  ) {
    return "score snapshot was too old when the record artifact was written";
  }

  return undefined;
}

function isBytes32(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isScore(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 100;
}

function isValidDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function createEvidenceHash(payload: unknown): string {
  return `0x${createHash("sha256").update(stableStringify(payload)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;

    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}
