import {
  getRiskLevel,
  type PatternDetected,
  type WavyRiskResult
} from "@arkscore/shared";
import { createHash } from "node:crypto";

export function createMockWavyRiskResult(input: {
  address: `0x${string}`;
  chainId: number;
}): WavyRiskResult {
  const digest = createHash("sha256")
    .update(`${input.address.toLowerCase()}:${input.chainId}`)
    .digest("hex");
  const seed = Number.parseInt(digest.slice(0, 8), 16);
  const riskScore = seed % 86;
  const riskLevel = getRiskLevel(riskScore);
  const patternsDetected = createPatterns(riskScore, seed);
  const suspiciousActivity =
    riskScore >= 70 ||
    patternsDetected.some((pattern) => pattern.severity === "critical") ||
    patternsDetected.filter((pattern) => pattern.severity === "high").length >=
      3;

  return {
    analysisId: `mock-${digest.slice(0, 12)}`,
    address: input.address,
    chainId: input.chainId,
    riskScore,
    riskLevel,
    riskReason:
      riskScore < 40
        ? "Demo trace shows routine wallet behavior with no critical risk patterns."
        : "Demo trace found patterns that require institutional review before approval.",
    suspiciousActivity,
    patternsDetected,
    transactionsAnalyzed: 24 + (seed % 320),
    completedAt: new Date().toISOString()
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
