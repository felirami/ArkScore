import type { PatternDetected, WavyRiskResult } from "@arkscore/shared";
import { createWavyTraceability, getRiskLevel } from "@arkscore/shared";
import { env, shouldAutoRegisterWavyAddresses } from "../config/env.js";
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
      patternsDetected?: PatternDetected[] | number;
      patterns?: Array<string | PatternDetected>;
      transactionsAnalyzed?: number;
      completedAt?: string;
    }>;
    missing?: number;
    missingAddresses?: string[];
  };
  message?: string;
  error?: string;
};

type WavyScanRiskResult = NonNullable<
  NonNullable<WavyScanRiskResponse["data"]>["results"]
>[number];

type WavyInvestigationResponse = {
  success?: boolean;
  data?: {
    id?: string;
    analysis_id?: string | null;
    analysis_status?: "pending" | "running" | "completed" | "failed" | string;
    wallet?: string;
    chainId?: string | number;
    chain_id?: string | number;
    created_at?: string;
    updated_at?: string;
  };
  message?: string;
  error?: string;
};

type WavyInvestigation = {
  id?: string;
  analysisId?: string;
  analysisStatus?: string;
};

type WavyChainsResponse = {
  success?: boolean;
  data?: Array<{
    id?: string | number;
    name?: string;
    active?: boolean;
    explorer_url?: string;
    currency_symbol?: string;
  }>;
  message?: string;
  error?: string;
};

type WavyApiResponse = {
  message?: string;
  error?: string;
};

export type WavySupportedChain = {
  id: number;
  name: string;
  active: boolean;
  explorerUrl?: string;
  currencySymbol?: string;
};

export async function fetchWavySupportedChains(): Promise<
  WavySupportedChain[]
> {
  const authHeader = getWavyAuthHeader();
  const url = new URL(`${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/chains`);
  const { response, payload } = await fetchWavyJson<WavyChainsResponse>(url, {
    headers: {
      "x-api-key": authHeader,
      accept: "application/json",
    },
  });

  if (!response.ok || payload?.success === false) {
    throw new HttpError(
      response.ok ? 502 : response.status,
      payload?.message ??
        payload?.error ??
        `Wavy Node chains request failed with status ${response.status}.`,
    );
  }

  return (payload?.data ?? [])
    .map((chain) => {
      const id = Number(chain.id);
      if (!Number.isInteger(id) || id <= 0) return undefined;

      return {
        id,
        name: chain.name ?? `Chain ${id}`,
        active: chain.active !== false,
        ...(chain.explorer_url ? { explorerUrl: chain.explorer_url } : {}),
        ...(chain.currency_symbol
          ? { currencySymbol: chain.currency_symbol }
          : {}),
      };
    })
    .filter((chain): chain is WavySupportedChain => Boolean(chain));
}

export async function fetchWavyRiskResult(input: {
  address: `0x${string}`;
  chainId: number;
}): Promise<WavyRiskResult> {
  const projectId = getWavyProjectId();
  const authHeader = getWavyAuthHeader();
  const addressRegistration = shouldAutoRegisterWavyAddresses()
    ? "auto-registered-or-reused"
    : "preconfigured";

  if (shouldAutoRegisterWavyAddresses()) {
    await registerWavyAddress({
      address: input.address,
      projectId,
      authHeader,
    });
  }

  const existingResult = await fetchCompletedWavyScanRiskResult({
    ...input,
    projectId,
    authHeader,
  });

  if (existingResult) {
    return normalizeWavyRiskResult({
      result: existingResult,
      address: input.address,
      chainId: input.chainId,
      addressRegistration,
    });
  }

  const investigation = await createWavyInvestigation({
    ...input,
    projectId,
    authHeader,
  });
  const completedResult = await waitForCompletedWavyScanRiskResult({
    ...input,
    projectId,
    authHeader,
    investigation,
  });

  return normalizeWavyRiskResult({
    result: completedResult,
    address: input.address,
    chainId: input.chainId,
    addressRegistration,
  });
}

async function fetchCompletedWavyScanRiskResult(input: {
  address: `0x${string}`;
  chainId: number;
  projectId: string;
  authHeader: string;
}): Promise<WavyScanRiskResult | undefined> {
  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${input.projectId}/addresses/scan-risk`,
  );

  url.searchParams.set("addresses", input.address);
  url.searchParams.set("chainId", String(input.chainId));

  const { response, payload } = await fetchWavyJson<WavyScanRiskResponse>(url, {
    headers: {
      "x-api-key": input.authHeader,
      accept: "application/json",
    },
  });

  if (response.status === 404) return undefined;

  const errorMessage =
    payload?.message ??
    payload?.error ??
    `Wavy Node request failed with status ${response.status}.`;

  if (
    response.status >= 500 &&
    /timeout|timed out|canceling statement/i.test(errorMessage)
  ) {
    return undefined;
  }

  if (!response.ok || payload?.success === false) {
    throw new HttpError(response.ok ? 502 : response.status, errorMessage);
  }

  const firstResult = payload?.data?.results?.[0];

  return firstResult;
}

async function createWavyInvestigation(input: {
  address: `0x${string}`;
  chainId: number;
  projectId: string;
  authHeader: string;
}): Promise<WavyInvestigation> {
  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${input.projectId}/investigations`,
  );
  const { response, payload } = await fetchWavyJson<WavyInvestigationResponse>(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": input.authHeader,
        accept: "application/json",
      },
      body: JSON.stringify({
        name: `ArkScore wallet risk ${shortAddress(input.address)}`,
        wallet: input.address,
        chainId: String(input.chainId),
      }),
    },
  );

  if (!response.ok || payload?.success === false) {
    throw new HttpError(
      response.ok ? 502 : response.status,
      payload?.message ??
        payload?.error ??
        `Wavy Node investigation request failed with status ${response.status}.`,
    );
  }

  return {
    ...(payload?.data?.id ? { id: payload.data.id } : {}),
    ...(payload?.data?.analysis_id
      ? { analysisId: payload.data.analysis_id }
      : {}),
    ...(payload?.data?.analysis_status
      ? { analysisStatus: payload.data.analysis_status }
      : {}),
  };
}

async function waitForCompletedWavyScanRiskResult(input: {
  address: `0x${string}`;
  chainId: number;
  projectId: string;
  authHeader: string;
  investigation: WavyInvestigation;
}): Promise<WavyScanRiskResult> {
  const startedAt = Date.now();
  const deadline = startedAt + env.WAVY_NODE_ANALYSIS_POLL_TIMEOUT_MS;
  let investigation = input.investigation;

  while (true) {
    const result = await fetchCompletedWavyScanRiskResult(input);
    if (result) return result;

    if (investigation.id) {
      investigation = {
        ...investigation,
        ...(await fetchWavyInvestigation({
          investigationId: investigation.id,
          projectId: input.projectId,
          authHeader: input.authHeader,
        })),
      };
    }

    if (investigation.analysisStatus === "failed") {
      throw new HttpError(
        502,
        `Wavy Node investigation failed${investigation.id ? ` (investigation ${investigation.id})` : ""}${investigation.analysisId ? ` (analysis ${investigation.analysisId})` : ""}. Try another Avalanche wallet or retry after Wavy Node recovers.`,
      );
    }

    if (Date.now() >= deadline) {
      const suffix = [
        investigation.id ? `investigation ${investigation.id}` : undefined,
        investigation.analysisId
          ? `analysis ${investigation.analysisId}`
          : undefined,
        investigation.analysisStatus
          ? `status ${investigation.analysisStatus}`
          : undefined,
      ]
        .filter(Boolean)
        .join(", ");

      throw new HttpError(
        504,
        `Wavy Node investigation has not produced a completed risk result yet${suffix ? ` (${suffix})` : ""}. Retry shortly.`,
      );
    }

    await sleep(
      Math.min(env.WAVY_NODE_ANALYSIS_POLL_INTERVAL_MS, deadline - Date.now()),
    );
  }
}

async function fetchWavyInvestigation(input: {
  investigationId: string;
  projectId: string;
  authHeader: string;
}): Promise<WavyInvestigation> {
  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${input.projectId}/investigations/${input.investigationId}`,
  );
  const { response, payload } = await fetchWavyJson<WavyInvestigationResponse>(
    url,
    {
      headers: {
        "x-api-key": input.authHeader,
        accept: "application/json",
      },
    },
  );

  if (!response.ok || payload?.success === false) {
    return {};
  }

  return {
    ...(payload?.data?.id ? { id: payload.data.id } : {}),
    ...(payload?.data?.analysis_id
      ? { analysisId: payload.data.analysis_id }
      : {}),
    ...(payload?.data?.analysis_status
      ? { analysisStatus: payload.data.analysis_status }
      : {}),
  };
}

function normalizeWavyRiskResult(input: {
  result: WavyScanRiskResult;
  address: `0x${string}`;
  chainId: number;
  addressRegistration: "auto-registered-or-reused" | "preconfigured";
}): WavyRiskResult {
  const firstResult = input.result;

  const riskScore = clampWavyScore(firstResult.riskScore);
  const chainId = requireMatchingChainId(firstResult.chainId, input.chainId);
  validateReturnedAddress(firstResult.address, input.address);
  const patternsDetected = normalizePatternsDetected(firstResult);
  const transactionsAnalyzed = firstResult.transactionsAnalyzed ?? 0;
  const completedAt = firstResult.completedAt ?? new Date().toISOString();

  return {
    analysisId: firstResult.analysisId ?? "wavy-analysis-unavailable",
    address: input.address,
    chainId,
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    riskReason: firstResult.riskReason ?? "Wavy Node risk analysis completed.",
    suspiciousActivity: Boolean(firstResult.suspiciousActivity),
    patternsDetected,
    transactionsAnalyzed,
    completedAt,
    traceability: createWavyTraceability({
      chainId,
      addressRegistration: input.addressRegistration,
      transactionsAnalyzed,
      patternsDetected,
      completedAt,
    }),
  };
}

async function registerWavyAddress(input: {
  address: `0x${string}`;
  projectId: string;
  authHeader: string;
}): Promise<void> {
  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${input.projectId}/addresses`,
  );
  const { response, payload } = await fetchWavyJson<WavyApiResponse>(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": input.authHeader,
      accept: "application/json",
    },
    body: JSON.stringify({
      address: input.address,
      description: "ArkScore on-demand wallet risk score",
      foreign_user_id: createForeignUserId(input.address),
    }),
  });

  if (response.ok) return;

  const message =
    payload?.message ??
    payload?.error ??
    `Wavy Node address registration failed with status ${response.status}.`;

  if (response.status === 409 || /already|duplicate|exist/i.test(message)) {
    return;
  }

  throw new HttpError(response.status, message);
}

function clampWavyScore(score: number | undefined): number {
  if (typeof score !== "number" || !Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizePatternsDetected(
  result: WavyScanRiskResult,
): PatternDetected[] {
  if (Array.isArray(result.patternsDetected)) {
    return result.patternsDetected.map(normalizePatternDetected);
  }

  if (Array.isArray(result.patterns)) {
    return result.patterns.map((pattern, index) =>
      normalizePatternDetected(pattern, index),
    );
  }

  const count =
    typeof result.patternsDetected === "number" &&
    Number.isFinite(result.patternsDetected)
      ? Math.max(0, Math.round(result.patternsDetected))
      : 0;

  return Array.from({ length: count }, (_, index) => ({
    name: `Wavy pattern ${index + 1}`,
    severity: "medium",
  }));
}

function normalizePatternDetected(
  pattern: string | PatternDetected,
  index = 0,
): PatternDetected {
  if (typeof pattern === "string") {
    return {
      name: pattern,
      severity: "medium",
    };
  }

  return {
    name: pattern.name || `Wavy pattern ${index + 1}`,
    severity: pattern.severity || "medium",
    ...(typeof pattern.confidence === "number"
      ? { confidence: pattern.confidence }
      : {}),
  };
}

function requireMatchingChainId(
  value: string | number | undefined,
  expected: number,
): number {
  const chainId = Number(value ?? expected);

  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new HttpError(502, "Wavy Node returned an invalid chainId.");
  }

  if (chainId !== expected) {
    throw new HttpError(
      502,
      `Wavy Node returned chainId ${chainId}, expected ${expected}.`,
    );
  }

  return chainId;
}

function validateReturnedAddress(
  returnedAddress: string | undefined,
  expectedAddress: `0x${string}`,
) {
  if (
    returnedAddress &&
    returnedAddress.toLowerCase() !== expectedAddress.toLowerCase()
  ) {
    throw new HttpError(
      502,
      `Wavy Node returned address ${returnedAddress}, expected ${expectedAddress}.`,
    );
  }
}

async function fetchWavyJson<T>(
  url: URL,
  init: RequestInit,
): Promise<{ response: Response; payload: T | null }> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(env.WAVY_NODE_TIMEOUT_MS),
    });
    const payload = (await response.json().catch(() => null)) as T | null;

    return { response, payload };
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new HttpError(
        504,
        `Wavy Node request timed out after ${env.WAVY_NODE_TIMEOUT_MS}ms.`,
      );
    }

    throw error;
  }
}

function isAbortLikeError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function createForeignUserId(address: `0x${string}`): string {
  return `${env.WAVY_NODE_FOREIGN_USER_PREFIX}-${address.toLowerCase()}`;
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
