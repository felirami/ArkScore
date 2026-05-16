import { network } from "hardhat";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type Institution = "arkangeles" | "bankaool";
type InstitutionDecision =
  | "APPROVE_IFC_EQUITY_ISSUANCE"
  | "APPROVE_BANKAOOL_LOAN"
  | "REVIEW_REQUIRED"
  | "DECLINE";
type ScoreSource = "wavy" | "mock";

type DeploymentArtifact = {
  address?: string;
};

type ScoreApiResponse = {
  address: string;
  subjectHash: `0x${string}`;
  chainId: number;
  institution: Institution;
  source: ScoreSource;
  evidenceHash: `0x${string}`;
  wavy: {
    analysisId: string;
    riskScore: number;
    riskLevel?: string | undefined;
    traceability: {
      provider: string;
      network?: string | undefined;
      scanType?: string | undefined;
      riskScoreScale: string;
      transactionsAnalyzed?: number | undefined;
      patternsCount?: number | undefined;
    };
  };
  composite: {
    creditScore: number;
    decision: InstitutionDecision;
    decisionLabel?: string | undefined;
  };
};

type ScoreRecord = {
  subjectHash: string;
  wavyRiskScore: bigint;
  compositeCreditScore: bigint;
  decision: bigint;
  wavyEvidenceHash: string;
  wavyAnalysisId: string;
  institution: string;
  updatedAt: bigint;
  submitter: string;
};

type CreditScoreRegistryInstance = {
  hasScore: (subjectHash: string) => Promise<boolean>;
  isScorer: (scorer: string) => Promise<boolean>;
  getScore: (subjectHash: string) => Promise<ScoreRecord>;
  recordScore: (
    subjectHash: string,
    wavyRiskScore: number,
    compositeCreditScore: number,
    decision: number,
    wavyEvidenceHash: string,
    wavyAnalysisId: string,
    institution: string,
  ) => Promise<{
    hash: string;
    wait: () => Promise<{ blockNumber?: number; hash?: string } | null>;
  }>;
};

const packageDir = dirname(fileURLToPath(import.meta.url));
const defaultWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const bytes32Regex = /^0x[a-fA-F0-9]{64}$/;
const decisionContractEnum: Record<InstitutionDecision, number> = {
  REVIEW_REQUIRED: 0,
  APPROVE_IFC_EQUITY_ISSUANCE: 1,
  APPROVE_BANKAOOL_LOAN: 2,
  DECLINE: 3,
};
const env = {
  ...readEnvFile(join(packageDir, "..", "..", "..", ".env")),
  ...readEnvFile(join(packageDir, "..", ".env")),
  ...readEnvFile(join(packageDir, "..", "..", "..", "apps", "api", ".env")),
  ...readEnvFile(
    join(packageDir, "..", "..", "..", "apps", "web", ".env.local"),
  ),
  ...process.env,
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  console.log("# ArkScore Fuji Score Recording\n");

  const apiUrl = requireBaseUrl(
    env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL,
  );
  const registryAddress = envRegistryAddress();
  const wallet = env.ARKSCORE_TEST_WALLET ?? defaultWallet;
  const institution = parseInstitution(env.ARKSCORE_INSTITUTION);
  const allowMockRecord = env.ARKSCORE_ALLOW_MOCK_RECORD === "true";

  const { ethers } = await network.create();

  if (!env.FUJI_PRIVATE_KEY?.trim()) {
    fail("Set FUJI_PRIVATE_KEY to the authorized Fuji scorer private key.");
  }

  if (!ethers.isAddress(registryAddress)) {
    fail(
      "Set ARKSCORE_REGISTRY_ADDRESS, CREDIT_SCORE_REGISTRY_ADDRESS, REGISTRY_ADDRESS, NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS, or deploy first.",
    );
  }

  if (!ethers.isAddress(wallet)) {
    fail("ARKSCORE_TEST_WALLET must be a valid EVM wallet address.");
  }

  const [scorer] = await ethers.getSigners();

  if (!scorer) {
    fail("No Fuji scorer signer available. Set FUJI_PRIVATE_KEY.");
  }

  const providerNetwork = await ethers.provider.getNetwork();
  const chainId = Number(providerNetwork.chainId);

  if (chainId !== 43113) {
    fail(`Expected Avalanche Fuji chain id 43113, received ${chainId}.`);
  }

  const score = await fetchScore({
    apiUrl,
    wallet,
    institution,
    allowMockRecord,
  });
  const registry = (await ethers.getContractAt(
    "CreditScoreRegistry",
    registryAddress,
  )) as unknown as CreditScoreRegistryInstance;
  const scorerAddress = await scorer.getAddress();
  const authorized = await registry.isScorer(scorerAddress);

  if (!authorized) {
    fail(
      `${scorerAddress} is not an authorized scorer on ${registryAddress}. Run scorer:fuji from the registry owner wallet first.`,
    );
  }

  const decision = decisionContractEnum[score.composite.decision];
  const hadRecord = await registry.hasScore(score.subjectHash);

  console.log(`[pass] Live API score fetched for ${shortAddress(wallet)}`);
  console.log(`api=${apiUrl}`);
  console.log(`registry=${registryAddress}`);
  console.log(`scorer=${scorerAddress}`);
  console.log(`subjectHash=${score.subjectHash}`);
  console.log(
    `wavyRisk=${score.wavy.riskScore}/100 (${score.wavy.riskLevel ?? "unknown"})`,
  );
  console.log(`compositeScore=${score.composite.creditScore}/100`);
  console.log(`decision=${score.composite.decision}`);
  console.log(`wavyAnalysisId=${score.wavy.analysisId}`);
  console.log(
    `traceability=${score.wavy.traceability.provider} ${score.wavy.traceability.scanType ?? "wallet-risk"} ${score.wavy.traceability.riskScoreScale}`,
  );
  console.log(`evidenceHash=${score.evidenceHash}`);
  console.log(`previousRecord=${hadRecord ? "yes" : "no"}`);

  const tx = await registry.recordScore(
    score.subjectHash,
    score.wavy.riskScore,
    score.composite.creditScore,
    decision,
    score.evidenceHash,
    score.wavy.analysisId,
    score.institution,
  );

  console.log(`[pass] Submitted recordScore tx ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`[pass] Fuji receipt block=${receipt?.blockNumber ?? "unknown"}`);

  const hasStoredScore = await registry.hasScore(score.subjectHash);
  if (!hasStoredScore) {
    fail(
      "Fuji registry did not report hasScore(subjectHash)=true after write.",
    );
  }

  const stored = await registry.getScore(score.subjectHash);
  verifyStoredScore({ stored, score, decision });

  console.log("[pass] Stored Fuji record matches the live Wavy API response");
  console.log(`submitter=${stored.submitter}`);
  console.log(`updatedAt=${stored.updatedAt.toString()}`);
}

async function fetchScore(input: {
  apiUrl: string;
  wallet: string;
  institution: Institution;
  allowMockRecord: boolean;
}): Promise<ScoreApiResponse> {
  const scoreUrl = `${input.apiUrl}/api/score/${input.wallet}?institution=${input.institution}`;
  const response = await fetch(scoreUrl, {
    headers: { accept: "application/json" },
  });
  const text = await response.text();

  if (!response.ok) {
    fail(`Score API returned ${response.status}: ${truncate(text)}`);
  }

  const score = parseScorePayload(parseJson(text));

  if (score.address.toLowerCase() !== input.wallet.toLowerCase()) {
    fail("Score API response address did not match the requested wallet.");
  }

  if (score.institution !== input.institution) {
    fail("Score API response institution did not match the request.");
  }

  if (score.chainId !== 43113) {
    fail(`Expected score chainId 43113, received ${score.chainId}.`);
  }

  if (score.source !== "wavy" && !input.allowMockRecord) {
    fail(
      `Refusing to store source=${score.source}. Set ARKSCORE_ALLOW_MOCK_RECORD=true only for a temporary dry demo.`,
    );
  }

  if (score.source === "mock") {
    console.log(
      "[warn] Recording a mock score because ARKSCORE_ALLOW_MOCK_RECORD=true.",
    );
  }

  return score;
}

function parseScorePayload(value: unknown): ScoreApiResponse {
  if (!isRecord(value)) {
    fail("Score API response must be a JSON object.");
  }

  const wavy = value.wavy;
  const composite = value.composite;

  if (!isRecord(wavy) || !isRecord(composite)) {
    fail("Score API response is missing wavy or composite objects.");
  }

  const traceability = wavy.traceability;
  if (!isRecord(traceability)) {
    fail("Score API response is missing Wavy traceability.");
  }

  const decision = composite.decision;
  if (!isInstitutionDecision(decision)) {
    fail("Score API response has an unsupported composite decision.");
  }

  const score: ScoreApiResponse = {
    address: requireString(value.address, "address"),
    subjectHash: requireBytes32(value.subjectHash, "subjectHash"),
    chainId: requireNumber(value.chainId, "chainId"),
    institution: parseInstitution(
      requireString(value.institution, "institution"),
    ),
    source: parseSource(requireString(value.source, "source")),
    evidenceHash: requireBytes32(value.evidenceHash, "evidenceHash"),
    wavy: {
      analysisId: requireString(wavy.analysisId, "wavy.analysisId"),
      riskScore: requireScore(wavy.riskScore, "wavy.riskScore"),
      riskLevel:
        typeof wavy.riskLevel === "string" ? wavy.riskLevel : undefined,
      traceability: {
        provider: requireString(
          traceability.provider,
          "wavy.traceability.provider",
        ),
        network:
          typeof traceability.network === "string"
            ? traceability.network
            : undefined,
        scanType:
          typeof traceability.scanType === "string"
            ? traceability.scanType
            : undefined,
        riskScoreScale: requireString(
          traceability.riskScoreScale,
          "wavy.traceability.riskScoreScale",
        ),
        transactionsAnalyzed:
          typeof traceability.transactionsAnalyzed === "number"
            ? traceability.transactionsAnalyzed
            : undefined,
        patternsCount:
          typeof traceability.patternsCount === "number"
            ? traceability.patternsCount
            : undefined,
      },
    },
    composite: {
      creditScore: requireScore(composite.creditScore, "composite.creditScore"),
      decision,
      decisionLabel:
        typeof composite.decisionLabel === "string"
          ? composite.decisionLabel
          : undefined,
    },
  };

  if (!/^0x[a-fA-F0-9]{40}$/.test(score.address)) {
    fail("Score API response address is not a valid EVM address.");
  }

  if (score.wavy.traceability.provider !== "Wavy Node") {
    fail("Score API response must include traceability.provider=Wavy Node.");
  }

  if (score.wavy.traceability.riskScoreScale !== "0-100") {
    fail("Score API response must include traceability.riskScoreScale=0-100.");
  }

  return score;
}

function verifyStoredScore(input: {
  stored: ScoreRecord;
  score: ScoreApiResponse;
  decision: number;
}) {
  const expected = {
    subjectHash: input.score.subjectHash.toLowerCase(),
    wavyRiskScore: input.score.wavy.riskScore,
    compositeCreditScore: input.score.composite.creditScore,
    decision: input.decision,
    wavyEvidenceHash: input.score.evidenceHash.toLowerCase(),
    wavyAnalysisId: input.score.wavy.analysisId,
    institution: input.score.institution,
  };
  const actual = {
    subjectHash: input.stored.subjectHash.toLowerCase(),
    wavyRiskScore: Number(input.stored.wavyRiskScore),
    compositeCreditScore: Number(input.stored.compositeCreditScore),
    decision: Number(input.stored.decision),
    wavyEvidenceHash: input.stored.wavyEvidenceHash.toLowerCase(),
    wavyAnalysisId: input.stored.wavyAnalysisId,
    institution: input.stored.institution,
  };

  for (const [key, expectedValue] of Object.entries(expected)) {
    if (actual[key as keyof typeof actual] !== expectedValue) {
      fail(`Stored ${key} mismatch after Fuji write.`);
    }
  }
}

function envRegistryAddress(): string {
  return (
    env.ARKSCORE_REGISTRY_ADDRESS ??
    env.CREDIT_SCORE_REGISTRY_ADDRESS ??
    env.REGISTRY_ADDRESS ??
    env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS ??
    readRegistryDeployment()?.address ??
    ""
  );
}

function readRegistryDeployment(): DeploymentArtifact | undefined {
  const candidates = [
    join(process.cwd(), "deployments", "fuji", "CreditScoreRegistry.json"),
    join(packageDir, "..", "deployments", "fuji", "CreditScoreRegistry.json"),
  ];

  for (const path of candidates) {
    if (!existsSync(path)) continue;

    try {
      return JSON.parse(readFileSync(path, "utf8")) as DeploymentArtifact;
    } catch {
      return undefined;
    }
  }

  return undefined;
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

function requireBaseUrl(value: string | undefined): string {
  const url = value?.trim().replace(/\/+$/, "");

  if (!url) {
    fail(
      "Set ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL to the Railway API.",
    );
  }

  if (!/^https?:\/\//.test(url)) {
    fail("ARKSCORE_API_URL must start with http:// or https://.");
  }

  return url;
}

function parseInstitution(value: string | undefined): Institution {
  if (value === undefined || value === "") return "bankaool";
  if (value === "arkangeles" || value === "bankaool") return value;

  fail("ARKSCORE_INSTITUTION must be arkangeles or bankaool.");
}

function parseSource(value: string): ScoreSource {
  if (value === "wavy" || value === "mock") return value;

  fail("Score API response source must be wavy or mock.");
}

function isInstitutionDecision(value: unknown): value is InstitutionDecision {
  return (
    value === "APPROVE_IFC_EQUITY_ISSUANCE" ||
    value === "APPROVE_BANKAOOL_LOAN" ||
    value === "REVIEW_REQUIRED" ||
    value === "DECLINE"
  );
}

function requireString(value: unknown, label: string): string {
  if (typeof value === "string" && value.trim()) return value;

  fail(`Score API response is missing ${label}.`);
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  fail(`Score API response ${label} must be a number.`);
}

function requireScore(value: unknown, label: string): number {
  const score = requireNumber(value, label);

  if (!Number.isInteger(score) || score < 0 || score > 100) {
    fail(`Score API response ${label} must be an integer from 0 to 100.`);
  }

  return score;
}

function requireBytes32(value: unknown, label: string): `0x${string}` {
  if (typeof value === "string" && bytes32Regex.test(value)) {
    return value as `0x${string}`;
  }

  fail(`Score API response ${label} must be a bytes32 hex string.`);
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    fail("Score API response was not valid JSON.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function truncate(value: string): string {
  if (value.length <= 240) return value;
  return `${value.slice(0, 237)}...`;
}

function fail(message: string): never {
  throw new Error(`[fail] ${message}`);
}
