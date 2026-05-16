import {
  computeCompositeScore,
  getRiskLevel,
  type Institution,
  type PatternDetected,
  type ScoreApiResponse
} from "@arkscore/shared";

const fujiChainId = 43113;

export async function createDemoScore(input: {
  address: string;
  institution: Institution;
}): Promise<ScoreApiResponse> {
  const address = input.address as `0x${string}`;
  const digest = await sha256Hex(`${address.toLowerCase()}:${fujiChainId}`);
  const seed = Number.parseInt(digest.slice(0, 8), 16);
  const riskScore = seed % 86;
  const patternsDetected = createPatterns(riskScore, seed);
  const suspiciousActivity =
    riskScore >= 70 ||
    patternsDetected.some((pattern) => pattern.severity === "critical") ||
    patternsDetected.filter((pattern) => pattern.severity === "high").length >=
      3;
  const completedAt = new Date().toISOString();
  const wavy = {
    analysisId: `demo-${digest.slice(0, 12)}`,
    address,
    chainId: fujiChainId,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    riskReason:
      riskScore < 40
        ? "Demo trace shows routine wallet behavior with no critical risk patterns."
        : "Demo trace found patterns that require institutional review before approval.",
    suspiciousActivity,
    patternsDetected,
    transactionsAnalyzed: 24 + (seed % 320),
    completedAt
  };
  const composite = computeCompositeScore({
    institution: input.institution,
    riskScore: wavy.riskScore,
    suspiciousActivity: wavy.suspiciousActivity,
    transactionsAnalyzed: wavy.transactionsAnalyzed,
    patternsDetected: wavy.patternsDetected
  });
  const generatedAt = new Date().toISOString();
  const source = "mock";
  const evidenceHash = await createEvidenceHash({
    address,
    chainId: wavy.chainId,
    institution: input.institution,
    source,
    wavy,
    composite
  });

  return {
    address,
    chainId: wavy.chainId,
    institution: input.institution,
    source,
    generatedAt,
    evidenceHash,
    wavy,
    composite
  };
}

function createPatterns(riskScore: number, seed: number): PatternDetected[] {
  if (riskScore < 20) return [];

  const basePatterns = [
    "counterparty concentration",
    "rapid fund movement",
    "new wallet interaction",
    "unusual transaction cadence"
  ];
  const count = Math.min(4, Math.max(1, Math.floor(riskScore / 20)));

  return Array.from({ length: count }, (_, index) => ({
    name: basePatterns[(seed + index) % basePatterns.length] ?? "wallet pattern",
    severity:
      riskScore >= 80
        ? "critical"
        : riskScore >= 60
          ? "high"
          : riskScore >= 40
            ? "medium"
            : "low",
    confidence: 0.62 + ((seed + index) % 28) / 100
  }));
}

async function createEvidenceHash(payload: unknown): Promise<`0x${string}`> {
  const stablePayload = stableStringify(payload);
  const digest = await sha256Hex(stablePayload);

  return `0x${digest}`;
}

async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", encoded);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
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
