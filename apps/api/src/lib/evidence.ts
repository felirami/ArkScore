import { createHash } from "node:crypto";

export function createEvidenceHash(payload: unknown): `0x${string}` {
  const stablePayload = stableStringify(payload);
  const digest = createHash("sha256").update(stablePayload).digest("hex");

  return `0x${digest}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
