import { createHmac, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

const integrationUserDataSchema = z.record(z.string(), z.unknown());

export const wavyWebhookPayloadSchema = z
  .object({
    type: z.enum(["notification", "error"]),
    data: z.unknown(),
  })
  .passthrough();

export type WavyWebhookPayload = z.infer<typeof wavyWebhookPayloadSchema>;

export function verifyWavyIntegrationRequest(request: Request): void {
  const secret = getIntegrationSecret();
  const timestamp = getWavyTimestamp(request);
  const signature = getSingleHeader(request, "x-wavynode-hmac");

  if (!signature) {
    throw new HttpError(401, "Missing Wavy Node HMAC signature.");
  }

  const ageMs = Math.abs(Date.now() - timestamp);

  if (ageMs > env.WAVY_NODE_INTEGRATION_TIME_TOLERANCE_MS) {
    throw new HttpError(401, "Expired Wavy Node signature timestamp.");
  }

  const expected = createWavyIntegrationSignature({
    method: request.method,
    path: request.path,
    body: request.body,
    timestamp,
    secret,
  });

  if (!safeEqual(signature, expected)) {
    throw new HttpError(401, "Invalid Wavy Node HMAC signature.");
  }
}

export function createWavyIntegrationSignature(input: {
  method: string;
  path: string;
  body: unknown;
  timestamp: number;
  secret: string;
}): string {
  return createHmac("sha256", input.secret)
    .update(createCanonicalWavyMessage(input))
    .digest("base64");
}

export function getWavyIntegrationUserData(
  foreignUserId: string,
): Record<string, unknown> {
  const rawUserData = env.WAVY_NODE_INTEGRATION_USER_DATA_JSON?.trim();

  if (!rawUserData || rawUserData.includes("replace_with")) {
    throw new HttpError(
      503,
      "WAVY_NODE_INTEGRATION_USER_DATA_JSON is required before Wavy Node can fetch compliance user data.",
    );
  }

  try {
    const parsed = integrationUserDataSchema.parse(JSON.parse(rawUserData));

    return {
      ...parsed,
      foreign_user_id: foreignUserId,
    };
  } catch {
    throw new HttpError(
      503,
      "WAVY_NODE_INTEGRATION_USER_DATA_JSON must be a JSON object.",
    );
  }
}

export function requireArkScoreForeignUserId(
  foreignUserId: string,
): `0x${string}` {
  const prefix = `${env.WAVY_NODE_FOREIGN_USER_PREFIX}-`;

  if (!foreignUserId.startsWith(prefix)) {
    throw new HttpError(404, "Unknown Wavy Node foreign user id.");
  }

  const address = foreignUserId.slice(prefix.length);

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    throw new HttpError(404, "Unknown Wavy Node foreign user id.");
  }

  return address as `0x${string}`;
}

function getIntegrationSecret(): string {
  const secret = env.WAVY_NODE_INTEGRATION_SECRET?.trim();

  if (!secret || secret.includes("replace_with")) {
    throw new HttpError(
      503,
      "WAVY_NODE_INTEGRATION_SECRET is required for signed Wavy Node integration requests.",
    );
  }

  return secret;
}

function getWavyTimestamp(request: Request): number {
  const timestampHeader = getSingleHeader(request, "x-wavynode-timestamp");

  if (!timestampHeader) {
    throw new HttpError(401, "Missing Wavy Node signature timestamp.");
  }

  const timestamp = Number(timestampHeader);

  if (!Number.isFinite(timestamp) || !Number.isInteger(timestamp)) {
    throw new HttpError(401, "Invalid Wavy Node signature timestamp.");
  }

  return timestamp;
}

function getSingleHeader(request: Request, name: string): string | undefined {
  const header = request.headers[name.toLowerCase()];

  if (Array.isArray(header)) {
    return header[0];
  }

  return header;
}

function createCanonicalWavyMessage(input: {
  method: string;
  path: string;
  body: unknown;
  timestamp: number;
}): string {
  return [
    input.method.toUpperCase(),
    input.path.toLowerCase(),
    stringifyCanonicalBody(input.body),
    String(input.timestamp),
  ].join("::");
}

function stringifyCanonicalBody(body: unknown): string {
  if (body === undefined || body === null || body === "") {
    return "{}";
  }

  return JSON.stringify(sortJsonValue(body));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => sortJsonValue(item));
  }

  if (isPlainRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortJsonValue(value[key])]),
    );
  }

  return value;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(
    value &&
      typeof value === "object" &&
      Object.getPrototypeOf(value) === Object.prototype,
  );
}

function safeEqual(received: string, expected: string): boolean {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}
