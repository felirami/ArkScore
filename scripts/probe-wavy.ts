import { existsSync, readFileSync } from "node:fs";

type Institution = "arkangeles" | "bankaool";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const demoSubjectHashSalt = "arkscore-demo-subject-hash-salt";
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("apps/api/.env"),
  ...process.env,
};

for (const [key, value] of Object.entries(env)) {
  if (value !== undefined && process.env[key] === undefined) {
    process.env[key] = value;
  }
}

process.env.WAVY_NODE_MOCK_MODE = "false";

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  console.log("# ArkScore Wavy Node Probe\n");

  const missing = [
    ["WAVY_NODE_API_KEY", env.WAVY_NODE_API_KEY],
    ["WAVY_NODE_PROJECT_ID", env.WAVY_NODE_PROJECT_ID],
    ["ARKSCORE_SUBJECT_HASH_SALT", env.ARKSCORE_SUBJECT_HASH_SALT],
  ]
    .filter(([, value]) => !hasUsableValue(value))
    .map(([key]) => key);

  if (missing.length > 0) {
    fail(`Missing live probe inputs: ${missing.join(", ")}`);
  }

  if (!hasProductionSubjectHashSalt(env.ARKSCORE_SUBJECT_HASH_SALT)) {
    fail(
      "ARKSCORE_SUBJECT_HASH_SALT must be a production value of at least 32 characters.",
    );
  }

  const address = env.ARKSCORE_TEST_WALLET ?? demoWallet;
  const institution = parseInstitution(env.ARKSCORE_INSTITUTION);

  if (!isAddress(address)) {
    fail("ARKSCORE_TEST_WALLET must be a valid EVM address.");
  }

  const { scoreWallet } = await import("../apps/api/src/services/score.js");
  const score = await scoreWallet({ address, institution });

  if (score.source !== "wavy") {
    fail(`Expected source=wavy, received source=${score.source}.`);
  }

  console.log(
    `[pass] Wavy credentials accepted for project ${redactProjectId()}`,
  );
  console.log(
    `[pass] Live Wavy score returned for ${shortAddress(score.address)}`,
  );
  console.log("");
  console.log(`- Institution: ${score.institution}`);
  console.log(
    `- Wavy risk: ${score.wavy.riskScore}/100 (${score.wavy.riskLevel})`,
  );
  console.log(`- Composite score: ${score.composite.creditScore}/100`);
  console.log(`- Decision: ${score.composite.decisionLabel}`);
  console.log(`- Wavy analysis id: ${score.wavy.analysisId}`);
  console.log(
    `- Traceability: ${score.wavy.traceability.provider} ${score.wavy.traceability.scanType} on ${score.wavy.traceability.network}`,
  );
  console.log(`- AI risk scale: ${score.wavy.traceability.riskScoreScale}`);
  console.log(
    `- Address registration: ${score.wavy.traceability.addressRegistration}`,
  );
  console.log(
    `- Transactions analyzed: ${score.wavy.traceability.transactionsAnalyzed}`,
  );
  console.log(`- Patterns detected: ${score.wavy.traceability.patternsCount}`);
  console.log(`- Subject hash: ${score.subjectHash}`);
  console.log(`- Evidence hash: ${score.evidenceHash}`);
}

function parseInstitution(value: string | undefined): Institution {
  if (value === undefined || value === "") return "bankaool";
  if (value === "arkangeles" || value === "bankaool") return value;

  fail("ARKSCORE_INSTITUTION must be arkangeles or bankaool.");
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

function hasUsableValue(value: string | undefined): value is string {
  return Boolean(
    value &&
    value.trim() &&
    !value.includes("replace_with") &&
    !value.includes("wavy_replace") &&
    !value.includes("your-"),
  );
}

function hasProductionSubjectHashSalt(value: string | undefined): boolean {
  return Boolean(
    value &&
    value.trim() &&
    value !== demoSubjectHashSalt &&
    value.length >= 32 &&
    !value.includes("replace_with") &&
    !value.includes("your-"),
  );
}

function isAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function redactProjectId(): string {
  const projectId = env.WAVY_NODE_PROJECT_ID ?? "";

  if (projectId.length <= 8) {
    return "[configured]";
  }

  return `${projectId.slice(0, 4)}...${projectId.slice(-4)}`;
}

function fail(message: string): never {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
