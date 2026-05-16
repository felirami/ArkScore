import {
  computeCompositeScore,
  ethereumAddressSchema,
  institutionSchema,
  type Institution,
  type ScoreApiResponse,
  type WavyRiskResult,
} from "@arkscore/shared";
import { env, shouldUseMockScores } from "../config/env.js";
import { createEvidenceHash, createSubjectHash } from "../lib/evidence.js";
import { HttpError } from "../lib/http-error.js";
import { createMockWavyRiskResult } from "./mock-wavy-node.js";
import { fetchWavyRiskResult } from "./wavy-node.js";

export async function scoreWallet(input: {
  address: string;
  institution?: string;
}): Promise<ScoreApiResponse> {
  const address = ethereumAddressSchema.parse(input.address) as `0x${string}`;
  const institution = parseInstitution(input.institution);
  const wavy = await getRiskResult(address, env.WAVY_NODE_CHAIN_ID);
  const composite = computeCompositeScore({
    institution,
    riskScore: wavy.riskScore,
    suspiciousActivity: wavy.suspiciousActivity,
    transactionsAnalyzed: wavy.transactionsAnalyzed,
    patternsDetected: wavy.patternsDetected,
  });
  const source = shouldUseMockScores() ? "mock" : "wavy";
  const generatedAt = new Date().toISOString();
  const subjectHash = createSubjectHash({
    address,
    chainId: wavy.chainId,
    institution,
    salt: env.ARKSCORE_SUBJECT_HASH_SALT,
  });
  const evidenceHash = createEvidenceHash({
    address,
    subjectHash,
    chainId: wavy.chainId,
    institution,
    source,
    wavy,
    composite,
  });

  return {
    address,
    subjectHash,
    chainId: wavy.chainId,
    institution,
    source,
    generatedAt,
    evidenceHash,
    wavy,
    composite,
  };
}

async function getRiskResult(
  address: `0x${string}`,
  chainId: number,
): Promise<WavyRiskResult> {
  if (shouldUseMockScores()) {
    return createMockWavyRiskResult({ address, chainId });
  }

  return fetchWavyRiskResult({ address, chainId });
}

function parseInstitution(value: string | undefined): Institution {
  const fallback: Institution = "arkangeles";
  const parsed = institutionSchema.safeParse(value ?? fallback);

  if (!parsed.success) {
    throw new HttpError(
      400,
      "Unsupported institution. Use institution=arkangeles or institution=bankaool.",
    );
  }

  return parsed.data;
}
