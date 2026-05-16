import assert from "node:assert/strict";
import test from "node:test";
import { HttpError } from "../lib/http-error.js";
import { fetchWavyRiskResult, fetchWavySupportedChains } from "./wavy-node.js";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const originalFetch = globalThis.fetch;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
});

type CapturedRequest = {
  url: URL;
  init: RequestInit | undefined;
};

test("fetchWavySupportedChains requests the Wavy chains endpoint", async () => {
  let request: CapturedRequest | undefined;

  globalThis.fetch = (async (input, init) => {
    request = {
      url: new URL(getFetchUrl(input)),
      init,
    };

    return jsonResponse({
      success: true,
      data: [
        {
          id: 43113,
          name: "Avalanche Fuji",
          active: true,
          explorer_url: "https://testnet.snowtrace.io",
          currency_symbol: "AVAX",
        },
      ],
    });
  }) as typeof fetch;

  const chains = await fetchWavySupportedChains();

  assert.ok(request);
  assert.equal(
    `${request.url.origin}${request.url.pathname}`,
    "https://api.wavynode.com/v1/chains",
  );
  assert.equal(getHeader(request.init, "x-api-key"), "ApiKey wavy_test_key");
  assert.equal(getHeader(request.init, "accept"), "application/json");
  assert.deepEqual(chains, [
    {
      id: 43113,
      name: "Avalanche Fuji",
      active: true,
      explorerUrl: "https://testnet.snowtrace.io",
      currencySymbol: "AVAX",
    },
  ]);
});

test("fetchWavyRiskResult registers then scans the wallet", async () => {
  const requests: CapturedRequest[] = [];

  globalThis.fetch = (async (input, init) => {
    const url = new URL(getFetchUrl(input));
    requests.push({ url, init });

    if (init?.method === "POST") {
      return jsonResponse({ success: true });
    }

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

  const [registerRequest, scanRequest] = requests;

  assert.ok(registerRequest);
  assert.equal(
    `${registerRequest.url.origin}${registerRequest.url.pathname}`,
    "https://api.wavynode.com/v1/projects/project_test/addresses",
  );
  assert.equal(registerRequest.init?.method, "POST");
  assert.equal(
    getHeader(registerRequest.init, "content-type"),
    "application/json",
  );
  assert.equal(
    getHeader(registerRequest.init, "x-api-key"),
    "ApiKey wavy_test_key",
  );
  assert.deepEqual(parseBody(registerRequest.init), {
    address: demoWallet,
    description: "ArkScore on-demand wallet risk score",
    foreign_user_id: `arkscore-wallet-${demoWallet.toLowerCase()}`,
  });

  assert.ok(scanRequest);
  assert.equal(
    `${scanRequest.url.origin}${scanRequest.url.pathname}`,
    "https://api.wavynode.com/v1/projects/project_test/addresses/scan-risk",
  );
  assert.equal(scanRequest.url.searchParams.get("addresses"), demoWallet);
  assert.equal(scanRequest.url.searchParams.get("chainId"), "43113");
  assert.equal(
    getHeader(scanRequest.init, "x-api-key"),
    "ApiKey wavy_test_key",
  );
  assert.equal(getHeader(scanRequest.init, "accept"), "application/json");

  assert.equal(result.analysisId, "analysis-001");
  assert.equal(result.address, demoWallet);
  assert.equal(result.chainId, 43113);
  assert.equal(result.riskScore, 6);
  assert.equal(result.riskLevel, "minimal");
  assert.equal(result.suspiciousActivity, false);
  assert.equal(result.transactionsAnalyzed, 150);
  assert.equal(result.traceability.provider, "Wavy Node");
  assert.equal(result.traceability.network, "Avalanche Fuji");
  assert.equal(result.traceability.riskScoreScale, "0-100");
  assert.equal(
    result.traceability.addressRegistration,
    "auto-registered-or-reused",
  );
  assert.equal(result.traceability.transactionsAnalyzed, 150);
  assert.equal(result.traceability.patternsCount, 0);
});

test("fetchWavyRiskResult treats duplicate address registration as reusable", async () => {
  const requests: CapturedRequest[] = [];

  globalThis.fetch = (async (input, init) => {
    requests.push({
      url: new URL(getFetchUrl(input)),
      init,
    });

    if (init?.method === "POST") {
      return jsonResponse(
        {
          success: false,
          message: "Address already exists in project.",
        },
        409,
      );
    }

    return jsonResponse({
      success: true,
      data: {
        results: [
          {
            analysisId: "analysis-reused",
            address: demoWallet,
            chainId: "43113",
            riskScore: 22,
            suspiciousActivity: false,
          },
        ],
      },
    });
  }) as typeof fetch;

  const result = await fetchWavyRiskResult({
    address: demoWallet,
    chainId: 43113,
  });

  assert.equal(requests.length, 2);
  assert.equal(result.analysisId, "analysis-reused");
  assert.equal(result.riskScore, 22);
  assert.equal(
    result.traceability.addressRegistration,
    "auto-registered-or-reused",
  );
});

test("fetchWavyRiskResult preserves upstream Wavy Node errors", async () => {
  globalThis.fetch = (async (_input, init) => {
    if (init?.method === "POST") {
      return jsonResponse({ success: true });
    }

    return jsonResponse(
      {
        success: false,
        message: "Invalid API key",
      },
      401,
    );
  }) as typeof fetch;

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

function parseBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== "string") {
    throw new Error("Expected JSON string body.");
  }

  return JSON.parse(init.body);
}
