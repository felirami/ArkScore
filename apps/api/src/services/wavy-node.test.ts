import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../lib/http-error.js";
import { fetchWavyRiskResult } from "./wavy-node.js";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

test("fetchWavyRiskResult calls the official scan-risk endpoint", async () => {
  let request:
    | {
        url: URL;
        init: RequestInit | undefined;
      }
    | undefined;

  globalThis.fetch = (async (input, init) => {
    const url = new URL(getFetchUrl(input));
    request = { url, init };

    return jsonResponse({
      success: true,
      data: {
        total: 1,
        missing: 0,
        results: [
          {
            analysisId: "analysis-001",
            address: demoWallet,
            chainId: "43113",
            riskScore: 6,
            riskLevel: "minimal",
            riskReason: "Normal activity, no suspicious patterns detected.",
            suspiciousActivity: false,
            patternsDetected: [],
            transactionsAnalyzed: 150,
            completedAt: "2026-05-16T10:30:00.000Z",
          },
        ],
      },
    });
  }) as typeof fetch;

  const result = await fetchWavyRiskResult({
    address: demoWallet,
    chainId: 43113,
  });

  assert.ok(request);
  assert.equal(
    `${request.url.origin}${request.url.pathname}`,
    "https://api.wavynode.com/v1/projects/project_test/addresses/scan-risk",
  );
  assert.equal(request.url.searchParams.get("addresses"), demoWallet);
  assert.equal(request.url.searchParams.get("chainId"), "43113");
  assert.equal(getHeader(request.init, "x-api-key"), "ApiKey wavy_test_key");
  assert.equal(getHeader(request.init, "accept"), "application/json");

  assert.equal(result.analysisId, "analysis-001");
  assert.equal(result.address, demoWallet);
  assert.equal(result.chainId, 43113);
  assert.equal(result.riskScore, 6);
  assert.equal(result.riskLevel, "minimal");
  assert.equal(result.suspiciousActivity, false);
  assert.equal(result.transactionsAnalyzed, 150);
});

test("fetchWavyRiskResult preserves upstream Wavy Node errors", async () => {
  globalThis.fetch = (async () =>
    jsonResponse(
      {
        success: false,
        message: "Invalid API key",
      },
      401,
    )) as typeof fetch;

  await assert.rejects(
    fetchWavyRiskResult({
      address: demoWallet,
      chainId: 43113,
    }),
    (error: unknown) => {
      assert.ok(error instanceof HttpError);
      assert.equal(error.statusCode, 401);
      assert.match(error.message, /Invalid API key/);
      return true;
    },
  );
});

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

function getFetchUrl(input: string | URL | Request): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

function getHeader(init: RequestInit | undefined, name: string): string | null {
  if (!init?.headers) return null;
  const headers = init.headers;

  if (headers instanceof Headers) return headers.get(name);
  if (Array.isArray(headers)) {
    return (
      headers.find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ??
      null
    );
  }

  return headers[name] ?? null;
}
