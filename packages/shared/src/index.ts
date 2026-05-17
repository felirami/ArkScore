import { z } from "zod";

export const ethereumAddressSchema = z
  .string()
  .regex(
    /^0x[a-fA-F0-9]{40}$/,
    "Expected a valid EVM wallet address.",
  ) as z.ZodType<`0x${string}`>;

export const institutionSchema = z.enum(["arkangeles", "bankaool"]);

export const institutionDecisionSchema = z.enum([
  "APPROVE_IFC_EQUITY_ISSUANCE",
  "APPROVE_BANKAOOL_LOAN",
  "REVIEW_REQUIRED",
  "DECLINE",
]);

export const riskLevelSchema = z.enum([
  "verified",
  "minimal",
  "low",
  "medium",
  "high",
  "critical",
]);

export const scoreSourceSchema = z.enum(["wavy", "mock"]);

export const bytes32Schema = z
  .string()
  .regex(
    /^0x[a-fA-F0-9]{64}$/,
    "Expected a 32-byte hex string.",
  ) as z.ZodType<`0x${string}`>;

export type Institution = z.infer<typeof institutionSchema>;
export type InstitutionDecision = z.infer<typeof institutionDecisionSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export type ScoreSource = z.infer<typeof scoreSourceSchema>;

export type PatternDetected = {
  name: string;
  severity: "low" | "medium" | "high" | "critical" | string;
  confidence?: number | undefined;
};

export type WavyAddressRegistration =
  | "auto-registered-or-reused"
  | "preconfigured"
  | "demo";

export type WavyTraceability = {
  provider: "Wavy Node";
  network: string;
  scanType: "wallet-risk";
  riskScoreScale: "0-100";
  addressRegistration: WavyAddressRegistration;
  transactionsAnalyzed: number;
  patternsCount: number;
  completedAt: string;
};

export type WavyRiskResult = {
  analysisId: string;
  address: `0x${string}`;
  chainId: number;
  riskScore: number;
  riskLevel: RiskLevel;
  riskReason: string;
  suspiciousActivity: boolean;
  patternsDetected: PatternDetected[];
  transactionsAnalyzed: number;
  completedAt: string;
  traceability: WavyTraceability;
};

export type CompositeScore = {
  creditScore: number;
  decision: InstitutionDecision;
  decisionLabel: string;
  recommendation: string;
};

export type ScoreApiResponse = {
  address: `0x${string}`;
  subjectHash: `0x${string}`;
  chainId: number;
  institution: Institution;
  source: ScoreSource;
  generatedAt: string;
  evidenceHash: `0x${string}`;
  wavy: WavyRiskResult;
  composite: CompositeScore;
};

export const patternDetectedSchema = z.object({
  name: z.string(),
  severity: z.string(),
  confidence: z.number().optional(),
}) satisfies z.ZodType<PatternDetected>;

export const wavyTraceabilitySchema = z.object({
  provider: z.literal("Wavy Node"),
  network: z.string(),
  scanType: z.literal("wallet-risk"),
  riskScoreScale: z.literal("0-100"),
  addressRegistration: z.enum([
    "auto-registered-or-reused",
    "preconfigured",
    "demo",
  ]),
  transactionsAnalyzed: z.number().int().nonnegative(),
  patternsCount: z.number().int().nonnegative(),
  completedAt: z.string().min(1),
}) satisfies z.ZodType<WavyTraceability>;

const scoreValueSchema = z.number().int().min(0).max(100);

export const wavyRiskResultSchema = z.object({
  analysisId: z.string().min(1),
  address: ethereumAddressSchema,
  chainId: z.number().int().positive(),
  riskScore: scoreValueSchema,
  riskLevel: riskLevelSchema,
  riskReason: z.string().min(1),
  suspiciousActivity: z.boolean(),
  patternsDetected: z.array(patternDetectedSchema),
  transactionsAnalyzed: z.number().int().nonnegative(),
  completedAt: z.string().min(1),
  traceability: wavyTraceabilitySchema,
}) satisfies z.ZodType<WavyRiskResult>;

export const compositeScoreSchema = z.object({
  creditScore: scoreValueSchema,
  decision: institutionDecisionSchema,
  decisionLabel: z.string().min(1),
  recommendation: z.string().min(1),
}) satisfies z.ZodType<CompositeScore>;

export const scoreApiResponseSchema = z.object({
  address: ethereumAddressSchema,
  subjectHash: bytes32Schema,
  chainId: z.number().int().positive(),
  institution: institutionSchema,
  source: scoreSourceSchema,
  generatedAt: z.string().min(1),
  evidenceHash: bytes32Schema,
  wavy: wavyRiskResultSchema,
  composite: compositeScoreSchema,
}) satisfies z.ZodType<ScoreApiResponse>;

export const decisionLabels: Record<InstitutionDecision, string> = {
  APPROVE_IFC_EQUITY_ISSUANCE: "Approve IFC equity issuance",
  APPROVE_BANKAOOL_LOAN: "Approve Bankaool loan",
  REVIEW_REQUIRED: "Route to institutional review",
  DECLINE: "Decline until risk is remediated",
};

export const decisionContractEnum: Record<InstitutionDecision, number> = {
  REVIEW_REQUIRED: 0,
  APPROVE_IFC_EQUITY_ISSUANCE: 1,
  APPROVE_BANKAOOL_LOAN: 2,
  DECLINE: 3,
};

export function getRiskLevel(riskScore: number): RiskLevel {
  const score = clampScore(riskScore);

  if (score === 0) return "verified";
  if (score < 20) return "minimal";
  if (score < 40) return "low";
  if (score < 60) return "medium";
  if (score < 80) return "high";
  return "critical";
}

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function computeCompositeScore(input: {
  institution: Institution;
  riskScore: number;
  suspiciousActivity: boolean;
  transactionsAnalyzed: number;
  patternsDetected: PatternDetected[];
}): CompositeScore {
  const riskScore = clampScore(input.riskScore);
  const traceabilityBonus = getTraceabilityBonus(input.transactionsAnalyzed);
  const patternPenalty = Math.min(input.patternsDetected.length * 4, 16);
  const suspiciousPenalty = input.suspiciousActivity ? 12 : 0;
  const institutionAdjustment = input.institution === "bankaool" ? -2 : 0;

  const creditScore = clampScore(
    100 -
      riskScore +
      traceabilityBonus -
      patternPenalty -
      suspiciousPenalty +
      institutionAdjustment,
  );

  const decision = chooseDecision({
    institution: input.institution,
    riskScore,
    creditScore,
    suspiciousActivity: input.suspiciousActivity,
  });

  return {
    creditScore,
    decision,
    decisionLabel: decisionLabels[decision],
    recommendation: getRecommendation(input.institution, decision),
  };
}

export function createWavyTraceability(input: {
  chainId: number;
  addressRegistration: WavyAddressRegistration;
  transactionsAnalyzed: number;
  patternsDetected: PatternDetected[];
  completedAt: string;
}): WavyTraceability {
  return {
    provider: "Wavy Node",
    network:
      input.chainId === 43113 ? "Avalanche Fuji" : `EVM ${input.chainId}`,
    scanType: "wallet-risk",
    riskScoreScale: "0-100",
    addressRegistration: input.addressRegistration,
    transactionsAnalyzed: Math.max(0, Math.round(input.transactionsAnalyzed)),
    patternsCount: input.patternsDetected.length,
    completedAt: input.completedAt,
  };
}

function getTraceabilityBonus(transactionsAnalyzed: number): number {
  if (transactionsAnalyzed >= 150) return 10;
  if (transactionsAnalyzed >= 50) return 7;
  if (transactionsAnalyzed > 0) return 4;
  return 0;
}

function chooseDecision(input: {
  institution: Institution;
  riskScore: number;
  creditScore: number;
  suspiciousActivity: boolean;
}): InstitutionDecision {
  if (
    input.riskScore >= 80 ||
    input.creditScore < 35 ||
    (input.suspiciousActivity && input.riskScore >= 70)
  ) {
    return "DECLINE";
  }

  if (
    input.institution === "arkangeles" &&
    input.creditScore >= 72 &&
    input.riskScore < 40
  ) {
    return "APPROVE_IFC_EQUITY_ISSUANCE";
  }

  if (
    input.institution === "bankaool" &&
    input.creditScore >= 68 &&
    input.riskScore < 45
  ) {
    return "APPROVE_BANKAOOL_LOAN";
  }

  return "REVIEW_REQUIRED";
}

function getRecommendation(
  institution: Institution,
  decision: InstitutionDecision,
): string {
  if (decision === "APPROVE_IFC_EQUITY_ISSUANCE") {
    return "Arkangeles can continue the IFC equity issuance flow with standard compliance monitoring.";
  }

  if (decision === "APPROVE_BANKAOOL_LOAN") {
    return "Bankaool can proceed to loan terms while retaining the on-chain score record for audit.";
  }

  if (decision === "DECLINE") {
    return "Do not approve until the wallet owner resolves high-risk activity or supplies additional evidence.";
  }

  return institution === "arkangeles"
    ? "Send this wallet to Arkangeles risk review before equity issuance approval."
    : "Send this applicant to Bankaool underwriting review before loan approval.";
}
