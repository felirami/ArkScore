import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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

type ScoreRecordProof = {
  blockNumber?: number | null;
  chainId?: number;
  composite?: {
    creditScore?: number;
    decision?: string;
  };
  generatedAt?: string;
  institution?: string;
  registryAddress?: string;
  scorerAddress?: string;
  source?: string;
  subjectHash?: string;
  transactionHash?: string;
  wavy?: {
    analysisId?: string;
    evidenceHash?: string;
    riskScore?: number;
  };
};

type ReportInput = {
  generatedAt: string;
  gitCommit: string;
  gitBranch: string;
  gitStatus: string;
  checkResults: CommandResult[];
  deploymentTargets: DeploymentTargets;
  scoreRecordProof?: ScoreRecordProof;
  requireEerc20: boolean;
};

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
  const gitStatus = commandText("git", ["status", "--short"]);
  const checkResults = skipChecks ? [] : runChecks();
  const markdown = renderReport({
    generatedAt,
    gitCommit,
    gitBranch,
    gitStatus,
    checkResults,
    deploymentTargets: getDeploymentTargets(),
    scoreRecordProof: readScoreRecordProof(),
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
  if (failedChecks.length > 0) {
    process.exitCode = 1;
  }
}

function runChecks(): CommandResult[] {
  const checks = [
    ...(includeVerify
      ? [{ label: "Full repo verification", command: "pnpm --silent verify" }]
      : []),
    { label: "Hosted demo smoke", command: "pnpm --silent smoke:web" },
    {
      label: "Live deployment verifier",
      command: "pnpm --silent verify:live",
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

\`\`\`text
${result.output.trim() || "(no output)"}
\`\`\``,
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
${renderScoreRecordProof(input.scoreRecordProof)}

## Evidence Summary

${checkSummary}

## Current Scope Status

- Frontend dashboard: production-hosted demo fallback is public and judge-usable.
- Backend API: Railway-ready Express service is built and tested locally, but live deployment still needs Railway auth and Wavy credentials.
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
  const finalizeCommand = requireEerc20
    ? "ARKSCORE_API_URL=https://your-railway-api.up.railway.app ARKSCORE_REQUIRE_EERC20=true pnpm finalize:live:apply"
    : "ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live:apply";
  const preflightCommand = requireEerc20
    ? "ARKSCORE_API_URL=https://your-railway-api.up.railway.app ARKSCORE_REGISTRY_ADDRESS=0x... ARKSCORE_SCORER_ADDRESS=0x... ARKSCORE_REQUIRE_EERC20=true pnpm verify:live:preflight"
    : "ARKSCORE_API_URL=https://your-railway-api.up.railway.app ARKSCORE_REGISTRY_ADDRESS=0x... ARKSCORE_SCORER_ADDRESS=0x... pnpm verify:live:preflight";
  const verifyCommand = requireEerc20
    ? "pnpm verify:live:strict:eerc20:record"
    : "pnpm verify:live:strict:record";

  return [
    "pnpm probe:wavy",
    "pnpm probe:fuji",
    eerc20ProbeCommand,
    "pnpm deploy:railway:apply -- --create-domain",
    "pnpm --filter @arkscore/contracts deploy:fuji",
    "pnpm --filter @arkscore/contracts scorer:fuji",
    "pnpm record:fuji",
    preflightCommand,
    finalizeCommand,
    verifyCommand,
  ].join("\n");
}

function commandText(command: string, commandArgs: string[]) {
  return runCommand(command, commandArgs).output.trim();
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
    apiUrl: normalizeBaseUrl(
      env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL,
    ),
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

function readScoreRecordProof(): ScoreRecordProof | undefined {
  const path =
    env.ARKSCORE_SCORE_RECORD_ARTIFACT ??
    "packages/contracts/deployments/fuji/LatestScoreRecord.json";

  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as ScoreRecordProof;
  } catch {
    return undefined;
  }
}

function firstValidAddress(values: Array<string | undefined>) {
  return values.find((value) => value && isAddress(value));
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function renderUrlOrTbd(value: string | undefined, fallback: string) {
  return value ? value : `\`${fallback}\``;
}

function renderAddressOrTbd(value: string | undefined, fallback: string) {
  return value ? `\`${value}\`` : `\`${fallback}\``;
}

function renderScoreRecordProof(proof: ScoreRecordProof | undefined) {
  if (!proof) {
    return "- Latest Fuji score record: `TBD until pnpm record:fuji writes LatestScoreRecord.json`";
  }

  return [
    "- Latest Fuji score record:",
    `  - Transaction: \`${proof.transactionHash ?? "unknown"}\``,
    `  - Block: \`${proof.blockNumber ?? "unknown"}\``,
    `  - Subject hash: \`${proof.subjectHash ?? "unknown"}\``,
    `  - Evidence hash: \`${proof.wavy?.evidenceHash ?? "unknown"}\``,
    `  - Wavy analysis id: \`${proof.wavy?.analysisId ?? "unknown"}\``,
    `  - Scores: Wavy \`${proof.wavy?.riskScore ?? "unknown"}/100\`, composite \`${proof.composite?.creditScore ?? "unknown"}/100\``,
    `  - Decision: \`${proof.composite?.decision ?? "unknown"}\` for \`${proof.institution ?? "unknown"}\``,
    `  - Source: \`${proof.source ?? "unknown"}\` on chain \`${proof.chainId ?? "unknown"}\``,
  ].join("\n");
}

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-9;]*m/g, "");
}
