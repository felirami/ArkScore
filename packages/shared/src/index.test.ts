import { strict as assert } from "node:assert";
import test from "node:test";
import {
  computeCompositeScore,
  createWavyTraceability,
  scoreApiResponseSchema,
  type ScoreApiResponse,
} from "./index.js";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const generatedAt = "2026-05-16T00:00:00.000Z";
const subjectHash =
  "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const evidenceHash =
  "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

test("scoreApiResponseSchema accepts a Fuji Wavy score payload", () => {
  const payload = createScorePayload();
  const parsed = scoreApiResponseSchema.safeParse(payload);

  assert.equal(parsed.success, true);
  if (!parsed.success) return;

  assert.equal(parsed.data.source, "wavy");
  assert.equal(parsed.data.chainId, 43113);
  assert.equal(parsed.data.subjectHash, subjectHash);
});

test("scoreApiResponseSchema rejects malformed score payloads before Fuji writes", () => {
  const payload = createScorePayload() as unknown as Record<string, unknown>;
  const wavy = payload.wavy as Record<string, unknown>;
  const traceability = wavy.traceability as Record<string, unknown>;

  payload.source = "mocked";
  payload.evidenceHash = "0x1234";
  wavy.riskScore = 101;
  traceability.riskScoreScale = "0-10";

  const parsed = scoreApiResponseSchema.safeParse(payload);

  assert.equal(parsed.success, false);
});

function createScorePayload(
  overrides: Partial<ScoreApiResponse> = {},
): ScoreApiResponse {
  const wavy: ScoreApiResponse["wavy"] = {
    analysisId: "wavy-live-123",
    address: demoWallet,
    chainId: 43113,
    riskScore: 18,
    riskLevel: "minimal",
    riskReason: "Low-risk Fuji wallet activity.",
    suspiciousActivity: false,
    patternsDetected: [],
    transactionsAnalyzed: 128,
    completedAt: generatedAt,
    traceability: createWavyTraceability({
      chainId: 43113,
      addressRegistration: "auto-registered-or-reused",
      transactionsAnalyzed: 128,
      patternsDetected: [],
      completedAt: generatedAt,
    }),
  };

  return {
    address: demoWallet,
    subjectHash,
    chainId: 43113,
    institution: "bankaool",
    source: "wavy",
    generatedAt,
    evidenceHash,
    wavy,
    composite: computeCompositeScore({
      institution: "bankaool",
      riskScore: wavy.riskScore,
      suspiciousActivity: wavy.suspiciousActivity,
      transactionsAnalyzed: wavy.transactionsAnalyzed,
      patternsDetected: wavy.patternsDetected,
    }),
    ...overrides,
  };
}
