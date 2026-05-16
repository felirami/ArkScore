import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

type CheckStatus = "pass" | "warn" | "fail";

type Check = {
  label: string;
  status: CheckStatus;
  detail: string;
};

type ScoreResponse = {
  address?: string;
  subjectHash?: string;
  chainId?: number;
  institution?: string;
  source?: "wavy" | "mock";
  evidenceHash?: string;
  wavy?: {
    analysisId?: string;
    riskScore?: number;
    traceability?: {
      provider?: string;
      riskScoreScale?: string;
      transactionsAnalyzed?: number;
      patternsCount?: number;
    };
  };
  composite?: {
    creditScore?: number;
    decisionLabel?: string;
  };
};

type OpenApiSchema = {
  required?: string[];
  properties?: Record<string, unknown>;
};

type OpenApiResponse = {
  openapi?: string;
  info?: {
    title?: string;
  };
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
};

const strict = process.argv.includes("--strict");
const requireWavy =
  process.argv.includes("--require-wavy") ||
  process.env.ARKSCORE_REQUIRE_WAVY === "true";
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/api/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const webUrl = normalizeBaseUrl(
  env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app",
);
const apiUrl = normalizeBaseUrl(
  env.ARKSCORE_API_URL ?? env.NEXT_PUBLIC_API_BASE_URL,
);
const registryAddress =
  env.ARKSCORE_REGISTRY_ADDRESS ??
  env.CREDIT_SCORE_REGISTRY_ADDRESS ??
  env.REGISTRY_ADDRESS ??
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS ??
  readRegistryDeployment()?.address;
const fujiRpcUrl =
  env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const testWallet =
  env.ARKSCORE_TEST_WALLET ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const scorerAddress = env.ARKSCORE_SCORER_ADDRESS ?? env.SCORER_ADDRESS;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const checks: Check[] = [];

  checks.push(...(await verifyWeb(webUrl)));
  checks.push(...(await verifyApi(apiUrl)));
  checks.push(...(await verifyContract(registryAddress)));

  const failed = checks.filter((check) => check.status === "fail");
  const warnings = checks.filter((check) => check.status === "warn");

  console.log("# ArkScore Live Verification\n");
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }

  console.log("\n## Summary\n");
  console.log(
    `- Passing: ${checks.filter((check) => check.status === "pass").length}`,
  );
  console.log(`- Warnings: ${warnings.length}`);
  console.log(`- Failing: ${failed.length}`);
  console.log(`- Report id: ${reportId(checks)}`);

  if (strict && (warnings.length > 0 || failed.length > 0)) {
    process.exitCode = 1;
  } else if (failed.length > 0) {
    process.exitCode = 1;
  }
}

async function verifyWeb(url: string | undefined): Promise<Check[]> {
  if (!url) {
    return [
      {
        label: "Vercel web",
        status: "warn",
        detail: "missing ARKSCORE_WEB_URL",
      },
    ];
  }

  const checks: Check[] = [];

  try {
    const response = await fetch(url);
    const html = await response.text();

    if (!response.ok) {
      return [
        {
          label: "Vercel web",
          status: "fail",
          detail: `${url} returned ${response.status}`,
        },
      ];
    }

    const hasArkScoreHtml = html.includes("ArkScore");

    checks.push(
      hasArkScoreHtml
        ? {
            label: "Vercel web",
            status: "pass",
            detail: `${url} returned ${response.status} and ArkScore HTML`,
          }
        : {
            label: "Vercel web",
            status: "fail",
            detail: `${url} returned ${response.status} but ArkScore text was missing`,
          },
    );

    if (hasArkScoreHtml) {
      checks.push(...(await verifyWebPublicConfig(url, html)));
    }
  } catch (error) {
    return [
      {
        label: "Vercel web",
        status: "fail",
        detail:
          error instanceof Error ? error.message : `could not reach ${url}`,
      },
    ];
  }

  return checks;
}

async function verifyWebPublicConfig(
  url: string,
  html: string,
): Promise<Check[]> {
  const expected = expectedPublicWebConfig();
  if (expected.length === 0) return [];

  const scripts = getScriptSources(html);

  if (scripts.length === 0) {
    return expected.map(({ label, value }) => ({
      label,
      status: "fail",
      detail: `could not inspect Next.js chunks for ${redactPublicValue(value)}`,
    }));
  }

  try {
    const bundleText = `${html}\n${await fetchBundles(scripts, url)}`;

    return expected.map(({ label, value }) =>
      bundleContainsValue(bundleText, value)
        ? {
            label,
            status: "pass",
            detail: `hosted bundle contains ${redactPublicValue(value)}`,
          }
        : {
            label,
            status: "fail",
            detail: `hosted bundle is missing ${redactPublicValue(value)}; redeploy Vercel after setting public env vars`,
          },
    );
  } catch (error) {
    return expected.map(({ label, value }) => ({
      label,
      status: "fail",
      detail: `${error instanceof Error ? error.message : "bundle inspection failed"} while checking ${redactPublicValue(value)}`,
    }));
  }
}

function expectedPublicWebConfig(): Array<{ label: string; value: string }> {
  const expected: Array<{ label: string; value: string }> = [];

  if (apiUrl) {
    expected.push({
      label: "Vercel web API config",
      value: apiUrl,
    });
  }

  if (registryAddress && isAddress(registryAddress)) {
    expected.push({
      label: "Vercel web registry config",
      value: registryAddress,
    });
  }

  return expected;
}

function getScriptSources(html: string): string[] {
  return [...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
    .map((match) => match[1] ?? "")
    .filter(Boolean);
}

async function fetchBundles(scripts: string[], baseUrl: string) {
  const chunks = await Promise.all(
    scripts.map(async (src) => {
      const url = new URL(src, baseUrl);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`${url.toString()} returned ${response.status}`);
      }

      return response.text();
    }),
  );

  return chunks.join("\n");
}

function bundleContainsValue(bundleText: string, value: string): boolean {
  const bundle = bundleText.toLowerCase();
  const normalized = value.toLowerCase();
  const escaped = normalized.replaceAll("/", "\\/");

  return bundle.includes(normalized) || bundle.includes(escaped);
}

function redactPublicValue(value: string): string {
  return isAddress(value) ? value : value.replace(/^https?:\/\//, "");
}

async function verifyApi(url: string | undefined): Promise<Check[]> {
  if (!url) {
    return [
      {
        label: "Railway API",
        status: "warn",
        detail: "missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL",
      },
    ];
  }

  const checks: Check[] = [];

  try {
    const healthResponse = await fetch(`${url}/health`);
    const health = (await healthResponse.json().catch(() => null)) as {
      ok?: boolean;
      service?: string;
      wavyCredentialsConfigured?: boolean;
      subjectHashSaltConfigured?: boolean;
      mockMode?: boolean;
    } | null;
    const healthValid =
      healthResponse.ok &&
      health?.ok === true &&
      health.service === "arkscore-api";

    checks.push(
      healthValid
        ? {
            label: "Railway API health",
            status: "pass",
            detail: `${url}/health returned ok`,
          }
        : {
            label: "Railway API health",
            status: "fail",
            detail: `${url}/health returned ${healthResponse.status}`,
          },
    );

    if (healthValid) {
      checks.push(
        health.subjectHashSaltConfigured === true
          ? {
              label: "Railway subject hash salt",
              status: "pass",
              detail: "production subject hash salt is configured",
            }
          : {
              label: "Railway subject hash salt",
              status: "warn",
              detail:
                "ARKSCORE_SUBJECT_HASH_SALT is missing or still using the demo default",
            },
      );

      checks.push(
        health.wavyCredentialsConfigured === true && health.mockMode === false
          ? {
              label: "Railway Wavy mode",
              status: "pass",
              detail: "live Wavy credentials configured and mock mode disabled",
            }
          : {
              label: "Railway Wavy mode",
              status: "warn",
              detail:
                "WAVY_NODE_API_KEY/WAVY_NODE_PROJECT_ID are missing or API is still serving mock mode",
            },
      );
    }
  } catch (error) {
    checks.push({
      label: "Railway API health",
      status: "fail",
      detail: error instanceof Error ? error.message : "health request failed",
    });
  }

  try {
    const openApiResponse = await fetch(`${url}/openapi.json`);
    const openApi = (await openApiResponse
      .json()
      .catch(() => null)) as OpenApiResponse | null;
    const healthSchema = getOpenApiSchema(openApi, "HealthResponse");
    const scoreSchema = getOpenApiSchema(openApi, "ScoreApiResponse");
    const wavySchema = getOpenApiSchema(openApi, "WavyRiskResult");
    const traceabilitySchema = getOpenApiSchema(openApi, "WavyTraceability");
    const contractValid =
      openApiResponse.ok &&
      Boolean(openApi?.openapi?.match(/^3\./)) &&
      openApi.info?.title === "ArkScore API" &&
      Boolean(openApi.paths?.["/health"]) &&
      Boolean(openApi.paths?.["/api/score/{address}"]) &&
      schemaRequires(healthSchema, "wavyCredentialsConfigured") &&
      schemaHasProperty(healthSchema, "wavyCredentialsConfigured") &&
      schemaRequires(healthSchema, "subjectHashSaltConfigured") &&
      schemaHasProperty(healthSchema, "subjectHashSaltConfigured") &&
      schemaRequires(healthSchema, "mockMode") &&
      schemaHasProperty(healthSchema, "mockMode") &&
      schemaRequires(scoreSchema, "subjectHash") &&
      schemaHasProperty(scoreSchema, "subjectHash") &&
      schemaPattern(scoreSchema, "subjectHash") === "^0x[a-fA-F0-9]{64}$" &&
      Boolean(wavySchema) &&
      schemaRequires(wavySchema, "traceability") &&
      schemaHasProperty(wavySchema, "traceability") &&
      schemaRequires(traceabilitySchema, "riskScoreScale") &&
      schemaHasProperty(traceabilitySchema, "addressRegistration") &&
      !schemaRequires(wavySchema, "subjectHash") &&
      !schemaHasProperty(wavySchema, "subjectHash");

    checks.push(
      contractValid
        ? {
            label: "Railway API OpenAPI",
            status: "pass",
            detail: `${url}/openapi.json documents health, score, and privacy hash fields`,
          }
        : {
            label: "Railway API OpenAPI",
            status: "fail",
            detail: `${url}/openapi.json returned invalid contract or status ${openApiResponse.status}`,
          },
    );
  } catch (error) {
    checks.push({
      label: "Railway API OpenAPI",
      status: "fail",
      detail: error instanceof Error ? error.message : "OpenAPI request failed",
    });
  }

  try {
    const scoreResponse = await fetch(
      `${url}/api/score/${testWallet}?institution=bankaool`,
    );
    const score = (await scoreResponse
      .json()
      .catch(() => null)) as ScoreResponse | null;
    const scoreShapeValid =
      scoreResponse.ok &&
      score?.institution === "bankaool" &&
      score.chainId === 43113 &&
      Boolean(score.subjectHash?.match(/^0x[a-f0-9]{64}$/)) &&
      isScore(score.wavy?.riskScore) &&
      score.wavy?.traceability?.provider === "Wavy Node" &&
      score.wavy?.traceability?.riskScoreScale === "0-100" &&
      Number.isInteger(score.wavy?.traceability?.transactionsAnalyzed) &&
      Number.isInteger(score.wavy?.traceability?.patternsCount) &&
      isScore(score.composite?.creditScore) &&
      Boolean(score.evidenceHash?.match(/^0x[a-f0-9]{64}$/));
    const sourceStatus = score?.source === "wavy" ? "pass" : "warn";
    const sourceDetail =
      score?.source === "wavy"
        ? "live Wavy Node response"
        : `response source is ${score?.source ?? "unknown"}`;

    checks.push(
      scoreShapeValid
        ? {
            label: "Railway API score",
            status: requireWavy ? sourceStatus : "pass",
            detail: `${sourceDetail}; Bankaool score response is valid`,
          }
        : {
            label: "Railway API score",
            status: "fail",
            detail: `${url}/api/score/:address returned invalid shape or status ${scoreResponse.status}`,
          },
    );
  } catch (error) {
    checks.push({
      label: "Railway API score",
      status: "fail",
      detail: error instanceof Error ? error.message : "score request failed",
    });
  }

  return checks;
}

async function verifyContract(address: string | undefined): Promise<Check[]> {
  if (!address || !isAddress(address)) {
    return [
      {
        label: "Fuji registry contract",
        status: "warn",
        detail:
          "missing ARKSCORE_REGISTRY_ADDRESS or NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS",
      },
    ];
  }

  const checks: Check[] = [];
  const code = await rpc<string>("eth_getCode", [address, "latest"]);

  checks.push(
    code && code !== "0x"
      ? {
          label: "Fuji registry bytecode",
          status: "pass",
          detail: `${address} has deployed bytecode`,
        }
      : {
          label: "Fuji registry bytecode",
          status: "fail",
          detail: `${address} has no bytecode on Fuji`,
        },
  );

  try {
    const ownerCall = await rpc<string>("eth_call", [
      { to: address, data: "0x8da5cb5b" },
      "latest",
    ]);

    checks.push(
      isEncodedAddress(ownerCall)
        ? {
            label: "Fuji registry owner",
            status: "pass",
            detail: `owner() returned ${decodeAddress(ownerCall)}`,
          }
        : {
            label: "Fuji registry owner",
            status: "fail",
            detail: "owner() call did not return an encoded address",
          },
    );
  } catch (error) {
    checks.push({
      label: "Fuji registry owner",
      status: "fail",
      detail: error instanceof Error ? error.message : "owner() call failed",
    });
  }

  checks.push(await verifyRegistryAbi(address));
  checks.push(...(await verifyScorer(address, scorerAddress)));

  return checks;
}

async function verifyRegistryAbi(registry: string): Promise<Check> {
  try {
    const subjectHash = "0".repeat(64);
    const call = await rpc<string>("eth_call", [
      { to: registry, data: `0x92b8c652${subjectHash}` },
      "latest",
    ]);

    return isEncodedBool(call)
      ? {
          label: "Fuji registry ABI",
          status: "pass",
          detail: `hasScore(bytes32) returned ${decodeBool(call)}`,
        }
      : {
          label: "Fuji registry ABI",
          status: "fail",
          detail: "hasScore(bytes32) did not return an encoded bool",
        };
  } catch (error) {
    return {
      label: "Fuji registry ABI",
      status: "fail",
      detail:
        error instanceof Error
          ? error.message
          : "hasScore(bytes32) call failed",
    };
  }
}

async function verifyScorer(
  registry: string,
  scorer: string | undefined,
): Promise<Check[]> {
  if (!scorer || !isAddress(scorer)) {
    return [
      {
        label: "Fuji scorer authorization",
        status: "warn",
        detail:
          "missing ARKSCORE_SCORER_ADDRESS to prove the dashboard signer is authorized",
      },
    ];
  }

  try {
    const encodedScorer = scorer.slice(2).padStart(64, "0");
    const call = await rpc<string>("eth_call", [
      { to: registry, data: `0x73c4502c${encodedScorer}` },
      "latest",
    ]);
    const authorized = BigInt(call) === 1n;

    return [
      authorized
        ? {
            label: "Fuji scorer authorization",
            status: "pass",
            detail: `${scorer} is authorized`,
          }
        : {
            label: "Fuji scorer authorization",
            status: "fail",
            detail: `${scorer} is not authorized`,
          },
    ];
  } catch (error) {
    return [
      {
        label: "Fuji scorer authorization",
        status: "fail",
        detail:
          error instanceof Error ? error.message : "isScorer(address) failed",
      },
    ];
  }
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const response = await fetch(fujiRpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });
  const payload = (await response.json()) as {
    result?: T;
    error?: { message?: string };
  };

  if (!response.ok || payload.error || payload.result === undefined) {
    throw new Error(payload.error?.message ?? `RPC ${method} failed`);
  }

  return payload.result;
}

function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line
          .slice(index + 1)
          .trim()
          .replace(/^['"]|['"]$/g, "");

        return [key, value];
      }),
  );
}

function readRegistryDeployment(): { address?: string } | undefined {
  const path = "packages/contracts/deployments/fuji/CreditScoreRegistry.json";
  if (!existsSync(path)) return undefined;

  try {
    return JSON.parse(readFileSync(path, "utf8")) as { address?: string };
  } catch {
    return undefined;
  }
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function getOpenApiSchema(
  openApi: OpenApiResponse | null | undefined,
  name: string,
): OpenApiSchema | undefined {
  return openApi?.components?.schemas?.[name];
}

function schemaRequires(
  schema: OpenApiSchema | undefined,
  property: string,
): boolean {
  return schema?.required?.includes(property) ?? false;
}

function schemaHasProperty(
  schema: OpenApiSchema | undefined,
  property: string,
): boolean {
  return Boolean(schema?.properties?.[property]);
}

function schemaPattern(
  schema: OpenApiSchema | undefined,
  property: string,
): string | undefined {
  const propertySchema = schema?.properties?.[property];

  if (!propertySchema || typeof propertySchema !== "object") {
    return undefined;
  }

  const { pattern } = propertySchema as { pattern?: unknown };

  return typeof pattern === "string" ? pattern : undefined;
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isScore(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 100;
}

function isEncodedAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function isEncodedBool(value: string): boolean {
  return /^0x0{63}[01]$/.test(value);
}

function decodeAddress(value: string): string {
  return `0x${value.slice(-40)}`;
}

function decodeBool(value: string): boolean {
  return BigInt(value) === 1n;
}

function icon(status: CheckStatus): string {
  if (status === "pass") return "[pass]";
  if (status === "warn") return "[warn]";
  return "[fail]";
}

function reportId(value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 12);
}
