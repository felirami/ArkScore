import type { PatternDetected, WavyRiskResult } from "@arkscore/shared";
import { getRiskLevel } from "@arkscore/shared";
import { env } from "../config/env.js";
import { getWavyAuthHeader, getWavyProjectId } from "../config/wavy-node.js";
import { HttpError } from "../lib/http-error.js";

type WavyScanRiskResponse = {
  success?: boolean;
  data?: {
    results?: Array<{
      analysisId?: string;
      address?: string;
      chainId?: string | number;
      riskScore?: number;
      riskLevel?: string;
      riskReason?: string;
      suspiciousActivity?: boolean;
      patternsDetected?: PatternDetected[];
      transactionsAnalyzed?: number;
      completedAt?: string;
    }>;
  };
  message?: string;
  error?: string;
};

export async function fetchWavyRiskResult(input: {
  address: `0x${string}`;
  chainId: number;
}): Promise<WavyRiskResult> {
  const projectId = getWavyProjectId();
  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${projectId}/addresses/scan-risk`
  );

  url.searchParams.set("addresses", input.address);
  url.searchParams.set("chainId", String(input.chainId));

  const response = await fetch(url, {
    headers: {
      "x-api-key": getWavyAuthHeader(),
      accept: "application/json"
    }
  });

  const payload = (await response.json().catch(() => null)) as
    | WavyScanRiskResponse
    | null;

  if (!response.ok) {
    throw new HttpError(
      response.status,
      payload?.message ??
        payload?.error ??
        `Wavy Node request failed with status ${response.status}.`
    );
  }

  const firstResult = payload?.data?.results?.[0];

  if (!firstResult) {
    throw new HttpError(
      404,
      "Wavy Node returned no risk result for this wallet. Register the address in the Wavy project, then rescan."
    );
  }

  const riskScore = clampWavyScore(firstResult.riskScore);

  return {
    analysisId: firstResult.analysisId ?? "wavy-analysis-unavailable",
    address: input.address,
    chainId: Number(firstResult.chainId ?? input.chainId),
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    riskReason: firstResult.riskReason ?? "Wavy Node risk analysis completed.",
    suspiciousActivity: Boolean(firstResult.suspiciousActivity),
    patternsDetected: firstResult.patternsDetected ?? [],
    transactionsAnalyzed: firstResult.transactionsAnalyzed ?? 0,
    completedAt: firstResult.completedAt ?? new Date().toISOString()
  };
}

function clampWavyScore(score: number | undefined): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}
