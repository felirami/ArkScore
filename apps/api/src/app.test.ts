import { once } from "node:events";
import type { Server } from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "./app.js";
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
      subjectHashSaltConfigured: boolean;
    };

    assert.equal(response.status, 200);
    assert.equal(payload.ok, true);
    assert.equal(payload.service, "arkscore-api");
    assert.equal(payload.mockMode, true);
    assert.equal(payload.subjectHashSaltConfigured, false);
  });
});

test("openapi document describes the public scoring contract", async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/openapi.json`);
    const payload = (await response.json()) as {
      openapi: string;
      paths: Record<string, unknown>;
      components: {
        schemas: Record<string, OpenApiSchema>;
      };
    };
    const healthSchema = payload.components.schemas.HealthResponse;
    const scoreSchema = payload.components.schemas.ScoreApiResponse;
    const wavySchema = payload.components.schemas.WavyRiskResult;
    const traceabilitySchema = payload.components.schemas.WavyTraceability;
    const subjectHashSchema = scoreSchema?.properties?.subjectHash as
      | StringSchema
      | undefined;
    const scoreOperation = payload.paths["/api/score/{address}"] as
      | { get?: OpenApiOperation }
      | undefined;

    assert.equal(response.status, 200);
    assert.match(payload.openapi, /^3\./);
    assert.ok(payload.paths["/health"]);
    assert.ok(payload.paths["/api/score/{address}"]);
    assert.ok(scoreOperation?.get?.responses?.["400"]);
    assert.ok(scoreOperation?.get?.responses?.["404"]);
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
    assert.ok(healthSchema.required?.includes("subjectHashSaltConfigured"));
    assert.ok(healthSchema.properties?.subjectHashSaltConfigured);
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
    assert.equal(payload.chainId, 43113);
    assert.equal(payload.institution, "bankaool");
    assert.equal(payload.source, "mock");
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
