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
      patternsDetected?: PatternDetected[];
      transactionsAnalyzed?: number;
      completedAt?: string;
    }>;
  };
  message?: string;
  error?: string;
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
  const response = await fetch(url, {
    headers: {
      "x-api-key": authHeader,
      accept: "application/json",
    },
  });
  const payload = (await response
    .json()
    .catch(() => null)) as WavyChainsResponse | null;

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

  if (shouldAutoRegisterWavyAddresses()) {
    await registerWavyAddress({
      address: input.address,
      projectId,
      authHeader,
    });
  }

  const url = new URL(
    `${env.WAVY_NODE_BASE_URL.replace(/\/$/, "")}/projects/${projectId}/addresses/scan-risk`,
  );

  url.searchParams.set("addresses", input.address);
  url.searchParams.set("chainId", String(input.chainId));

  const response = await fetch(url, {
    headers: {
      "x-api-key": authHeader,
      accept: "application/json",
    },
  });

  const payload = (await response
    .json()
    .catch(() => null)) as WavyScanRiskResponse | null;

  if (!response.ok || payload?.success === false) {
    throw new HttpError(
      response.ok ? 502 : response.status,
      payload?.message ??
        payload?.error ??
        `Wavy Node request failed with status ${response.status}.`,
    );
  }

  const firstResult = payload?.data?.results?.[0];

  if (!firstResult) {
    throw new HttpError(
      404,
      "Wavy Node returned no risk result for this wallet. Register the address in the Wavy project, then rescan.",
    );
  }

  const riskScore = clampWavyScore(firstResult.riskScore);
  const chainId = Number(firstResult.chainId ?? input.chainId);
  const patternsDetected = firstResult.patternsDetected ?? [];
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
      addressRegistration: shouldAutoRegisterWavyAddresses()
        ? "auto-registered-or-reused"
        : "preconfigured",
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
  const response = await fetch(url, {
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

  const payload = (await response
    .json()
    .catch(() => null)) as WavyApiResponse | null;
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

function createForeignUserId(address: `0x${string}`): string {
  return `${env.WAVY_NODE_FOREIGN_USER_PREFIX}-${address.toLowerCase()}`;
}
