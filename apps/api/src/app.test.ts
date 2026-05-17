import { once } from "node:events";
import type { Server } from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createEvidenceHash } from "./lib/evidence.js";
import { createWavyIntegrationSignature } from "./services/wavy-integration.js";
import type { ScoreApiResponse } from "@arkscore/shared";

const demoWallet = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

type OpenApiSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
};

type OpenApiOperation = {
  responses?: Record<string, unknown>;
};

type OpenApiResponseObject = {
  headers?: Record<string, unknown>;
};

type StringSchema = {
  pattern?: string;
};

test("health reports mock scoring mode when credentials are absent", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    const payload = (await response.json()) as {
      ok: boolean;
      service: string;
      mockMode: boolean;
      wavyIntegrationConfigured: boolean;
      wavyChainId: number;
      registryChainId: number;
      subjectHashSaltConfigured: boolean;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.service, "arkscore-api");
    assert.equal(payload.mockMode, true);
    assert.equal(payload.wavyIntegrationConfigured, true);
    assert.equal(payload.wavyChainId, 43114);
    assert.equal(payload.registryChainId, 43113);
    assert.equal(payload.subjectHashSaltConfigured, false);
  });
});

test("openapi document describes the public scoring contract", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    const payload = (await response.json()) as {
      openapi: string;
      servers: Array<{ url?: string; description?: string }>;
      paths: Record<string, unknown>;
      components: {
        schemas: Record<string, OpenApiSchema>;
      };
    };
    const healthSchema = payload.components.schemas.HealthResponse;
    const scoreSchema = payload.components.schemas.ScoreApiResponse;
    const wavySchema = payload.components.schemas.WavyRiskResult;
    const traceabilitySchema = payload.components.schemas.WavyTraceability;
    const integrationUserSchema =
      payload.components.schemas.WavyIntegrationUserData;
    const webhookSchema = payload.components.schemas.WavyWebhookPayload;
    const subjectHashSchema = scoreSchema?.properties?.subjectHash as
      | StringSchema
      | undefined;
    const scoreOperation = payload.paths["/api/score/{address}"] as
      | { get?: OpenApiOperation }
      | undefined;

    assert.equal(response.status, 200);
    assert.match(payload.openapi, /^3\./);
    assert.equal(payload.servers[0]?.url, baseUrl);
    assert.equal(payload.servers[0]?.description, "Current API origin");
    assert.ok(payload.paths["/health"]);
    assert.ok(payload.paths["/api/score/{address}"]);
    assert.ok(payload.paths["/users/{foreignUserId}"]);
    assert.ok(payload.paths["/webhook"]);
    assert.ok(scoreOperation?.get?.responses?.["400"]);
    assert.ok(scoreOperation?.get?.responses?.["404"]);
    assert.ok(scoreOperation?.get?.responses?.["429"]);
    assert.ok(scoreOperation?.get?.responses?.["502"]);
    assert.ok(scoreOperation?.get?.responses?.["504"]);
    assert.ok(scoreOperation?.get?.responses?.["500"]);
    assert.ok(
      (
        scoreOperation?.get?.responses?.["200"] as
          | OpenApiResponseObject
          | undefined
      )?.headers?.["Cache-Control"],
    );
    assert.ok(healthSchema);
    assert.ok(scoreSchema);
    assert.ok(wavySchema);
    assert.ok(traceabilitySchema);
    assert.ok(integrationUserSchema);
    assert.ok(webhookSchema);
    assert.ok(healthSchema.required?.includes("subjectHashSaltConfigured"));
    assert.ok(healthSchema.required?.includes("wavyChainId"));
    assert.ok(healthSchema.required?.includes("registryChainId"));
    assert.ok(healthSchema.required?.includes("wavyIntegrationConfigured"));
    assert.ok(healthSchema.properties?.subjectHashSaltConfigured);
    assert.ok(healthSchema.properties?.wavyChainId);
    assert.ok(healthSchema.properties?.registryChainId);
    assert.ok(healthSchema.properties?.wavyIntegrationConfigured);
    assert.ok(integrationUserSchema.required?.includes("foreign_user_id"));
    assert.ok(webhookSchema.required?.includes("type"));
    assert.ok(scoreSchema.required?.includes("subjectHash"));
    assert.equal(subjectHashSchema?.pattern, "^0x[a-fA-F0-9]{64}$");
    assert.ok(wavySchema.required?.includes("traceability"));
    assert.ok(wavySchema.properties?.traceability);
    assert.ok(traceabilitySchema.required?.includes("riskScoreScale"));
    assert.ok(traceabilitySchema.properties?.addressRegistration);
    assert.ok(!wavySchema.required?.includes("subjectHash"));
    assert.ok(!wavySchema.properties?.subjectHash);
  });
});

test("openapi document honors Railway forwarded origin headers", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/openapi.json`, {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": "arkscore-api.up.railway.app",
      },
    });
    const payload = (await response.json()) as {
      servers: Array<{ url?: string }>;
    };

    assert.equal(response.status, 200);
    assert.equal(
      payload.servers[0]?.url,
      "https://arkscore-api.up.railway.app",
    );
  });
});

test("Wavy integration serves signed compliance user data", async () => {
  await withTestServer(async (baseUrl) => {
    const foreignUserId = createForeignUserId(demoWallet);
    const path = `/users/${foreignUserId}`;
    const response = await fetch(`${baseUrl}${path}`, {
      headers: createSignedWavyHeaders({
        method: "GET",
        path,
        body: undefined,
      }),
    });
    const payload = (await response.json()) as {
      foreign_user_id: string;
      givenName: string;
      email: string;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.foreign_user_id, foreignUserId);
    assert.equal(payload.givenName, "ArkScore");
    assert.equal(payload.email, "compliance@example.com");
  });
});

test("Wavy integration receives signed webhook alerts", async () => {
  await withTestServer(async (baseUrl) => {
    const body = {
      type: "notification",
      data: {
        id: 1,
        chainId: 43114,
        txHash: "0xwavy-test-transaction",
        address: {
          userId: createForeignUserId(demoWallet),
          address: demoWallet,
        },
      },
    };
    const path = "/webhook";
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...createSignedWavyHeaders({
          method: "POST",
          path,
          body,
        }),
      },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as {
      received: boolean;
      type: string;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.received, true);
    assert.equal(payload.type, "notification");
  });
});

test("Wavy integration rejects invalid signatures", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-wavynode-hmac": "invalid-signature",
        "x-wavynode-timestamp": String(Date.now()),
      },
      body: JSON.stringify({ type: "error", data: "test" }),
    });
    const payload = (await response.json()) as { error: string };

    assert.equal(response.status, 401);
    assert.match(payload.error, /Invalid Wavy Node HMAC signature/);
  });
});

test("score endpoint returns a Bankaool-ready mock Wavy response", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/score/${demoWallet}?institution=bankaool`,
    );
    const payload = (await response.json()) as ScoreApiResponse;

    assert.equal(response.status, 200);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("pragma") ?? "", /no-cache/);
    assert.equal(payload.address, demoWallet);
    assert.match(payload.subjectHash, /^0x[a-f0-9]{64}$/);
    assert.equal(payload.chainId, 43114);
    assert.equal(payload.institution, "bankaool");
    assert.equal(payload.source, "mock");
    assert.ok(Date.now() - Date.parse(payload.generatedAt) < 5000);
    assert.match(payload.wavy.analysisId, /^mock-/);
    assert.ok(payload.wavy.riskScore >= 0 && payload.wavy.riskScore <= 100);
    assert.equal(payload.wavy.traceability.provider, "Wavy Node");
    assert.equal(payload.wavy.traceability.riskScoreScale, "0-100");
    assert.equal(payload.wavy.traceability.addressRegistration, "demo");
    assert.equal(
      payload.wavy.traceability.transactionsAnalyzed,
      payload.wavy.transactionsAnalyzed,
    );
    assert.ok(
      payload.composite.creditScore >= 0 &&
        payload.composite.creditScore <= 100,
    );
    assert.match(payload.evidenceHash, /^0x[a-f0-9]{64}$/);
    assert.equal(
      payload.evidenceHash,
      createEvidenceHash({
        address: payload.address,
        subjectHash: payload.subjectHash,
        chainId: payload.chainId,
        institution: payload.institution,
        source: payload.source,
        generatedAt: payload.generatedAt,
        wavy: payload.wavy,
        composite: payload.composite,
      }),
    );
  });
});

test("score endpoint rejects unsupported institutions", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/score/${demoWallet}?institution=unknown`,
    );
    const payload = (await response.json()) as { error: string };

    assert.equal(response.status, 400);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(payload.error, /Unsupported institution/);
  });
});

test("score endpoint rate limits repeated clients", async () => {
  await withTestServer(async (baseUrl) => {
    const requestCount = env.ARKSCORE_SCORE_RATE_LIMIT_MAX + 1;
    let response: Response | undefined;

    for (let index = 0; index < requestCount; index += 1) {
      const currentResponse = await fetch(
        `${baseUrl}/api/score/${demoWallet}`,
        {
          headers: {
            "x-forwarded-for": "203.0.113.10",
          },
        },
      );

      if (index < requestCount - 1) {
        await currentResponse.arrayBuffer();
      }

      response = currentResponse;
    }

    assert(response);
    const payload = (await response.json()) as { error: string };
    assert.equal(response.status, 429);
    assert.match(response.headers.get("cache-control") ?? "", /no-store/);
    assert.match(response.headers.get("retry-after") ?? "", /^\d+$/);
    assert.equal(
      response.headers.get("ratelimit-limit"),
      String(env.ARKSCORE_SCORE_RATE_LIMIT_MAX),
    );
    assert.equal(response.headers.get("ratelimit-remaining"), "0");
    assert.match(payload.error, /Too many score requests/);
  });
});

function createSignedWavyHeaders(input: {
  method: string;
  path: string;
  body: unknown;
}): Record<string, string> {
  const secret = env.WAVY_NODE_INTEGRATION_SECRET;

  assert(secret);

  const timestamp = Date.now();

  return {
    "x-wavynode-hmac": createWavyIntegrationSignature({
      ...input,
      timestamp,
      secret,
    }),
    "x-wavynode-timestamp": String(timestamp),
  };
}

function createForeignUserId(address: string): string {
  return `${env.WAVY_NODE_FOREIGN_USER_PREFIX}-${address.toLowerCase()}`;
}

async function withTestServer(
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createApp().listen(0);

  try {
    await once(server, "listening");
    const address = server.address();

    assert(address && typeof address === "object");
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await closeServer(server);
  }
}

async function closeServer(server: Server) {
  if (!server.listening) return;

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
