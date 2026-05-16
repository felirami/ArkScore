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

type ScoreRecordProof = {
  apiUrl?: string;
  blockNumber?: number | null;
  chainId?: number;
  composite?: {
    creditScore?: number;
    decision?: string;
    decisionEnum?: number;
  };
  generatedAt?: string;
  institution?: string;
  registryAddress?: string;
  scorerAddress?: string;
  source?: "wavy" | "mock";
  stored?: {
    submitter?: string;
    updatedAt?: string;
  };
  subjectHash?: string;
  transactionHash?: string;
  wavy?: {
    analysisId?: string;
    evidenceHash?: string;
    riskScore?: number;
  };
};

type DecodedScoreRecord = {
  subjectHash: string;
  wavyRiskScore: number;
  compositeCreditScore: number;
  decision: number;
  wavyEvidenceHash: string;
  wavyAnalysisId: string;
  institution: string;
  updatedAt: string;
  submitter: string;
};

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

type OpenApiResponse = {
  openapi?: string;
  info?: {
    title?: string;
  };
  servers?: Array<{
    url?: string;
  }>;
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, OpenApiSchema>;
  };
};

class RpcError extends Error {
  constructor(
    message: string,
    readonly data?: string,
  ) {
    super(message);
  }
}

const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/api/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const defaultScoreRecordArtifactPath =
  "packages/contracts/deployments/fuji/LatestScoreRecord.json";
const strict = process.argv.includes("--strict");
const skipWeb = process.argv.includes("--skip-web");
const skipApi = process.argv.includes("--skip-api");
const skipContract = process.argv.includes("--skip-contract");
const skipEerc20 = process.argv.includes("--skip-eerc20");
const allowLocalApi =
  process.argv.includes("--allow-local-api") ||
  env.ARKSCORE_ALLOW_LOCAL_LIVE_VERIFY === "true";
const requireWavy =
  process.argv.includes("--require-wavy") ||
  env.ARKSCORE_REQUIRE_WAVY === "true";
const requireEerc20 =
  process.argv.includes("--require-eerc20") ||
  env.ARKSCORE_REQUIRE_EERC20 === "true";
const requireScoreRecord =
  process.argv.includes("--require-score-record") ||
  env.ARKSCORE_REQUIRE_SCORE_RECORD === "true";
const webUrl =
  normalizeBaseUrl(firstConfiguredValue([env.ARKSCORE_WEB_URL])) ??
  "https://arkscore-seven.vercel.app";
const apiUrl = normalizeBaseUrl(
  firstConfiguredValue([env.ARKSCORE_API_URL, env.NEXT_PUBLIC_API_BASE_URL]),
);
const registryAddress = firstConfiguredValue([
  env.ARKSCORE_REGISTRY_ADDRESS,
  env.CREDIT_SCORE_REGISTRY_ADDRESS,
  env.REGISTRY_ADDRESS,
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS,
  readRegistryDeployment()?.address,
]);
const eerc20DemoAddress = firstConfiguredValue([
  env.ARKSCORE_EERC20_DEMO_ADDRESS,
  env.EERC20_DEMO_ADDRESS,
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
]);
const fujiRpcUrl =
  firstConfiguredValue([env.FUJI_RPC_URL]) ??
  "https://api.avax-test.network/ext/bc/C/rpc";
const testWallet =
  firstConfiguredValue([env.ARKSCORE_TEST_WALLET]) ??
  "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const scorerAddress = firstConfiguredValue([
  env.ARKSCORE_SCORER_ADDRESS,
  env.SCORER_ADDRESS,
]);
const scoreRecordArtifactPath =
  firstConfiguredValue([env.ARKSCORE_SCORE_RECORD_ARTIFACT]) ??
  defaultScoreRecordArtifactPath;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const checks: Check[] = [];

  if (!skipWeb) checks.push(...(await verifyWeb(webUrl)));
  if (!skipApi) checks.push(...(await verifyApi(apiUrl)));
  if (!skipContract) checks.push(...(await verifyContract(registryAddress)));
  if (!skipEerc20) {
    checks.push(...(await verifyOptionalEerc20(eerc20DemoAddress)));
  }

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

  if (eerc20DemoAddress && isAddress(eerc20DemoAddress)) {
    expected.push({
      label: "Vercel web eERC20 config",
      value: eerc20DemoAddress,
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

  if (!allowLocalApi && !isPublicHttpsUrl(url)) {
    return [
      {
        label: "Railway API",
        status: strict ? "fail" : "warn",
        detail:
          "configured API URL must be a public HTTPS Railway API URL for live verification",
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
    const scoreOperation = getOpenApiOperation(
      openApi,
      "/api/score/{address}",
      "get",
    );
    const healthSchema = getOpenApiSchema(openApi, "HealthResponse");
    const scoreSchema = getOpenApiSchema(openApi, "ScoreApiResponse");
    const wavySchema = getOpenApiSchema(openApi, "WavyRiskResult");
    const traceabilitySchema = getOpenApiSchema(openApi, "WavyTraceability");
    const contractValid =
      openApiResponse.ok &&
      Boolean(openApi) &&
      Boolean(openApi?.openapi?.match(/^3\./)) &&
      openApi?.info?.title === "ArkScore API" &&
      serverDocumentsUrl(openApi, url) &&
      Boolean(openApi?.paths?.["/health"]) &&
      Boolean(openApi?.paths?.["/api/score/{address}"]) &&
      operationHasResponse(scoreOperation, "400") &&
      operationHasResponse(scoreOperation, "404") &&
      operationHasResponse(scoreOperation, "429") &&
      operationHasResponse(scoreOperation, "502") &&
      operationHasResponse(scoreOperation, "504") &&
      operationHasResponse(scoreOperation, "500") &&
      responseDocumentsHeader(scoreOperation, "200", "Cache-Control") &&
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
            detail: `${url}/openapi.json documents the served API origin, health, score, and privacy hash fields`,
          }
        : {
            label: "Railway API OpenAPI",
            status: "fail",
            detail: `${url}/openapi.json returned invalid contract, missing served origin, or status ${openApiResponse.status}`,
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
    const cacheControl = scoreResponse.headers.get("cache-control") ?? "";
    const rateLimit = scoreResponse.headers.get("ratelimit-limit") ?? "";
    const cacheValid = /\bno-store\b/i.test(cacheControl);
    const rateLimitValid = /^\d+$/.test(rateLimit);
    const sourceStatus = score?.source === "wavy" ? "pass" : "warn";
    const sourceDetail =
      score?.source === "wavy"
        ? "live Wavy Node response"
        : `response source is ${score?.source ?? "unknown"}`;

    checks.push(
      scoreShapeValid && cacheValid && rateLimitValid
        ? {
            label: "Railway API score",
            status: requireWavy ? sourceStatus : "pass",
            detail: `${sourceDetail}; Bankaool score response is valid, no-store, and rate-limited`,
          }
        : {
            label: "Railway API score",
            status: "fail",
            detail: `${url}/api/score/:address returned invalid shape, cache/rate-limit headers, or status ${scoreResponse.status}`,
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

  checks.push(...(await verifyRegistryAbi(address)));
  checks.push(...(await verifyScorer(address, scorerAddress)));
  checks.push(...(await verifyScoreRecordProof(address)));

  return checks;
}

async function verifyOptionalEerc20(
  address: string | undefined,
): Promise<Check[]> {
  if (!address) {
    return requireEerc20
      ? [
          {
            label: "Optional eERC20 demo contract",
            status: "fail",
            detail:
              "ARKSCORE_REQUIRE_EERC20=true but no eERC20 demo address is configured",
          },
        ]
      : [];
  }

  if (!isAddress(address)) {
    return [
      {
        label: "Optional eERC20 demo contract",
        status: "fail",
        detail: "configured eERC20 demo address is not a valid EVM address",
      },
    ];
  }

  try {
    const code = await rpc<string>("eth_getCode", [address, "latest"]);

    return [
      code && code !== "0x"
        ? {
            label: "Optional eERC20 demo contract",
            status: "pass",
            detail: `${address} has deployed bytecode`,
          }
        : {
            label: "Optional eERC20 demo contract",
            status: "fail",
            detail: `${address} has no bytecode on Fuji`,
          },
    ];
  } catch (error) {
    return [
      {
        label: "Optional eERC20 demo contract",
        status: "fail",
        detail:
          error instanceof Error
            ? error.message
            : "eERC20 bytecode check failed",
      },
    ];
  }
}

async function verifyRegistryAbi(registry: string): Promise<Check[]> {
  const checks: Check[] = [];
  const subjectHash = "0".repeat(64);

  try {
    const call = await rpc<string>("eth_call", [
      { to: registry, data: `0x92b8c652${subjectHash}` },
      "latest",
    ]);

    checks.push(
      isEncodedBool(call)
        ? {
            label: "Fuji registry hasScore ABI",
            status: "pass",
            detail: `hasScore(bytes32) returned ${decodeBool(call)}`,
          }
        : {
            label: "Fuji registry hasScore ABI",
            status: "fail",
            detail: "hasScore(bytes32) did not return an encoded bool",
          },
    );
  } catch (error) {
    checks.push({
      label: "Fuji registry hasScore ABI",
      status: "fail",
      detail:
        error instanceof Error
          ? error.message
          : "hasScore(bytes32) call failed",
    });
  }

  try {
    await rpc<string>("eth_call", [
      { to: registry, data: `0x7ba53285${subjectHash}` },
      "latest",
    ]);

    checks.push({
      label: "Fuji registry getScore ABI",
      status: "fail",
      detail: "getScore(bytes32) unexpectedly returned a record for zero hash",
    });
  } catch (error) {
    checks.push(
      error instanceof RpcError && hasMissingScoreSelector(error)
        ? {
            label: "Fuji registry getScore ABI",
            status: "pass",
            detail: "getScore(bytes32) reverted with MissingScore()",
          }
        : {
            label: "Fuji registry getScore ABI",
            status: "fail",
            detail:
              error instanceof Error
                ? error.message
                : "getScore(bytes32) call failed",
          },
    );
  }

  return checks;
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

async function verifyScoreRecordProof(registry: string): Promise<Check[]> {
  const proof = readScoreRecordProof();

  if (!proof) {
    return requireScoreRecord
      ? [
          {
            label: "Fuji score record proof",
            status: "fail",
            detail: `missing ${scoreRecordArtifactPath}; run pnpm record:fuji first`,
          },
        ]
      : [];
  }

  const validationError = validateScoreRecordProof(proof, registry);
  if (validationError) {
    return [
      {
        label: "Fuji score record proof",
        status: "fail",
        detail: validationError,
      },
    ];
  }

  const subjectHash = proof.subjectHash as `0x${string}`;

  try {
    const encodedSubjectHash = subjectHash.slice(2);
    const hasScoreCall = await rpc<string>("eth_call", [
      { to: registry, data: `0x92b8c652${encodedSubjectHash}` },
      "latest",
    ]);

    if (!isEncodedBool(hasScoreCall)) {
      return [
        {
          label: "Fuji score record proof",
          status: "fail",
          detail: "hasScore(subjectHash) did not return an encoded bool",
        },
      ];
    }

    if (!decodeBool(hasScoreCall)) {
      return [
        {
          label: "Fuji score record proof",
          status: "fail",
          detail: `${subjectHash} is not stored in the registry`,
        },
      ];
    }

    const getScoreCall = await rpc<string>("eth_call", [
      { to: registry, data: `0x7ba53285${encodedSubjectHash}` },
      "latest",
    ]);
    const stored = decodeScoreRecord(getScoreCall);
    const mismatch = compareScoreRecordProof(proof, stored);

    return [
      mismatch
        ? {
            label: "Fuji score record proof",
            status: "fail",
            detail: mismatch,
          }
        : {
            label: "Fuji score record proof",
            status: "pass",
            detail: `${scoreRecordArtifactPath} matches on-chain getScore(${shortHash(subjectHash)}) from tx ${proof.transactionHash}`,
          },
    ];
  } catch (error) {
    return [
      {
        label: "Fuji score record proof",
        status: "fail",
        detail:
          error instanceof Error
            ? error.message
            : "latest score record check failed",
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
    error?: { message?: string; data?: unknown };
  };

  if (!response.ok || payload.error || payload.result === undefined) {
    throw new RpcError(
      payload.error?.message ?? `RPC ${method} failed`,
      readRpcErrorData(payload.error?.data),
    );
  }

  return payload.result;
}

function readRpcErrorData(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    const { data, originalError } = value as {
      data?: unknown;
      originalError?: unknown;
    };

    return readRpcErrorData(data) ?? readRpcErrorData(originalError);
  }

  return undefined;
}

function hasMissingScoreSelector(error: RpcError) {
  return (
    error.data?.startsWith("0xe5fa9471") || error.message.includes("0xe5fa9471")
  );
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

function readScoreRecordProof(): ScoreRecordProof | undefined {
  if (!existsSync(scoreRecordArtifactPath)) return undefined;

  try {
    return JSON.parse(readFileSync(scoreRecordArtifactPath, "utf8")) as
      | ScoreRecordProof
      | undefined;
  } catch (error) {
    throw new Error(
      `${scoreRecordArtifactPath} is not valid JSON: ${error instanceof Error ? error.message : "parse failed"}`,
    );
  }
}

function validateScoreRecordProof(
  proof: ScoreRecordProof,
  registry: string,
): string | undefined {
  if (proof.source !== "wavy") {
    return `${scoreRecordArtifactPath} source is ${proof.source ?? "unknown"}, expected wavy`;
  }

  if (proof.chainId !== 43113) {
    return `${scoreRecordArtifactPath} chainId is ${proof.chainId ?? "unknown"}, expected 43113`;
  }

  if (!proof.apiUrl || !isPublicHttpsUrl(proof.apiUrl)) {
    return `${scoreRecordArtifactPath} is missing a public HTTPS Railway apiUrl`;
  }

  if (!proof.registryAddress || !isAddress(proof.registryAddress)) {
    return `${scoreRecordArtifactPath} is missing a valid registryAddress`;
  }

  if (proof.registryAddress.toLowerCase() !== registry.toLowerCase()) {
    return `${scoreRecordArtifactPath} registry address does not match configured registry`;
  }

  if (!proof.scorerAddress || !isAddress(proof.scorerAddress)) {
    return `${scoreRecordArtifactPath} is missing a valid scorerAddress`;
  }

  if (
    scorerAddress &&
    proof.scorerAddress.toLowerCase() !== scorerAddress.toLowerCase()
  ) {
    return `${scoreRecordArtifactPath} scorerAddress does not match configured scorer`;
  }

  if (!proof.subjectHash || !isBytes32(proof.subjectHash)) {
    return `${scoreRecordArtifactPath} is missing a valid subjectHash`;
  }

  if (!proof.wavy?.evidenceHash || !isBytes32(proof.wavy.evidenceHash)) {
    return `${scoreRecordArtifactPath} is missing a valid Wavy evidence hash`;
  }

  if (!proof.transactionHash || !isBytes32(proof.transactionHash)) {
    return `${scoreRecordArtifactPath} is missing a valid transaction hash`;
  }

  if (!isScore(proof.wavy.riskScore)) {
    return `${scoreRecordArtifactPath} is missing a valid Wavy risk score`;
  }

  if (!isScore(proof.composite?.creditScore)) {
    return `${scoreRecordArtifactPath} is missing a valid composite score`;
  }

  if (
    typeof proof.composite?.decisionEnum !== "number" ||
    proof.composite.decisionEnum < 0 ||
    proof.composite.decisionEnum > 3
  ) {
    return `${scoreRecordArtifactPath} is missing a valid decision enum`;
  }

  if (!proof.wavy.analysisId) {
    return `${scoreRecordArtifactPath} is missing the Wavy analysis id`;
  }

  if (!proof.institution) {
    return `${scoreRecordArtifactPath} is missing the institution`;
  }

  if (!proof.stored?.submitter || !isAddress(proof.stored.submitter)) {
    return `${scoreRecordArtifactPath} is missing the stored submitter`;
  }

  if (
    proof.stored.submitter.toLowerCase() !== proof.scorerAddress.toLowerCase()
  ) {
    return `${scoreRecordArtifactPath} stored submitter does not match scorerAddress`;
  }

  if (!proof.stored.updatedAt || !/^\d+$/.test(proof.stored.updatedAt)) {
    return `${scoreRecordArtifactPath} is missing the stored update timestamp`;
  }

  return undefined;
}

function compareScoreRecordProof(
  proof: ScoreRecordProof,
  stored: DecodedScoreRecord,
): string | undefined {
  const comparisons: Array<[string, unknown, unknown]> = [
    ["subjectHash", proof.subjectHash?.toLowerCase(), stored.subjectHash],
    ["wavyRiskScore", proof.wavy?.riskScore, stored.wavyRiskScore],
    [
      "compositeCreditScore",
      proof.composite?.creditScore,
      stored.compositeCreditScore,
    ],
    ["decision", proof.composite?.decisionEnum, stored.decision],
    [
      "wavyEvidenceHash",
      proof.wavy?.evidenceHash?.toLowerCase(),
      stored.wavyEvidenceHash,
    ],
    ["wavyAnalysisId", proof.wavy?.analysisId, stored.wavyAnalysisId],
    ["institution", proof.institution, stored.institution],
    ["submitter", proof.stored?.submitter?.toLowerCase(), stored.submitter],
    ["updatedAt", proof.stored?.updatedAt, stored.updatedAt],
  ];

  const mismatch = comparisons.find(
    ([, expected, actual]) => expected !== actual,
  );

  return mismatch
    ? `${scoreRecordArtifactPath} ${mismatch[0]} does not match on-chain getScore`
    : undefined;
}

function decodeScoreRecord(value: string): DecodedScoreRecord {
  const data = stripHexPrefix(value);
  const starts = candidateTupleStarts(data);
  let lastError: Error | undefined;

  for (const start of starts) {
    try {
      return decodeScoreRecordAt(data, start);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("decode failed");
    }
  }

  throw lastError ?? new Error("Could not decode getScore(bytes32) response.");
}

function decodeScoreRecordAt(
  data: string,
  tupleStart: number,
): DecodedScoreRecord {
  const subjectHash = `0x${readWord(data, tupleStart)}`.toLowerCase();
  const evidenceHash = `0x${readWord(data, tupleStart + 4 * 32)}`.toLowerCase();
  const analysisOffset = wordToNumber(readWord(data, tupleStart + 5 * 32));
  const institutionOffset = wordToNumber(readWord(data, tupleStart + 6 * 32));

  if (!isBytes32(subjectHash) || !isBytes32(evidenceHash)) {
    throw new Error("getScore(bytes32) returned malformed bytes32 fields.");
  }

  return {
    subjectHash,
    wavyRiskScore: wordToNumber(readWord(data, tupleStart + 32)),
    compositeCreditScore: wordToNumber(readWord(data, tupleStart + 2 * 32)),
    decision: wordToNumber(readWord(data, tupleStart + 3 * 32)),
    wavyEvidenceHash: evidenceHash,
    wavyAnalysisId: decodeAbiString(data, tupleStart, analysisOffset),
    institution: decodeAbiString(data, tupleStart, institutionOffset),
    updatedAt: wordToBigInt(readWord(data, tupleStart + 7 * 32)).toString(),
    submitter:
      `0x${readWord(data, tupleStart + 8 * 32).slice(-40)}`.toLowerCase(),
  };
}

function candidateTupleStarts(data: string): number[] {
  const starts = [0];

  try {
    const firstWord = readWord(data, 0);
    const offset = wordToNumber(firstWord);

    if (offset > 0 && offset * 2 < data.length && offset % 32 === 0) {
      starts.unshift(offset);
    }
  } catch {
    return starts;
  }

  return starts;
}

function decodeAbiString(data: string, tupleStart: number, offset: number) {
  if (offset < 9 * 32 || offset % 32 !== 0) {
    throw new Error("getScore(bytes32) returned malformed string offsets.");
  }

  const length = wordToNumber(readWord(data, tupleStart + offset));
  const valueStart = (tupleStart + offset + 32) * 2;
  const valueEnd = valueStart + length * 2;

  if (valueEnd > data.length) {
    throw new Error("getScore(bytes32) returned truncated string data.");
  }

  return Buffer.from(data.slice(valueStart, valueEnd), "hex").toString("utf8");
}

function readWord(data: string, byteOffset: number) {
  const start = byteOffset * 2;
  const word = data.slice(start, start + 64);

  if (word.length !== 64) {
    throw new Error("getScore(bytes32) returned truncated ABI data.");
  }

  return word;
}

function wordToNumber(word: string) {
  const value = wordToBigInt(word);

  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("ABI integer exceeds JavaScript safe integer range.");
  }

  return Number(value);
}

function wordToBigInt(word: string) {
  return BigInt(`0x${word}`);
}

function normalizeBaseUrl(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  return value.trim().replace(/\/$/, "");
}

function isPublicHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);

    return url.protocol === "https:" && !isLocalHostname(url.hostname);
  } catch {
    return false;
  }
}

function isLocalHostname(hostname: string): boolean {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    value === "localhost" ||
    value === "::1" ||
    value.endsWith(".local") ||
    value === "0.0.0.0" ||
    /^127\./.test(value) ||
    /^10\./.test(value) ||
    /^192\.168\./.test(value) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(value) ||
    /^169\.254\./.test(value)
  );
}

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function getOpenApiSchema(
  openApi: OpenApiResponse | null | undefined,
  name: string,
): OpenApiSchema | undefined {
  return openApi?.components?.schemas?.[name];
}

function getOpenApiOperation(
  openApi: OpenApiResponse | null | undefined,
  path: string,
  method: string,
): OpenApiOperation | undefined {
  const pathItem = openApi?.paths?.[path];

  if (!pathItem || typeof pathItem !== "object") {
    return undefined;
  }

  const operation = (pathItem as Record<string, unknown>)[method];

  return operation && typeof operation === "object"
    ? (operation as OpenApiOperation)
    : undefined;
}

function operationHasResponse(
  operation: OpenApiOperation | undefined,
  statusCode: string,
): boolean {
  return Boolean(operation?.responses?.[statusCode]);
}

function responseDocumentsHeader(
  operation: OpenApiOperation | undefined,
  statusCode: string,
  header: string,
): boolean {
  const response = operation?.responses?.[statusCode];

  return Boolean(
    response &&
    typeof response === "object" &&
    (response as OpenApiResponseObject).headers?.[header],
  );
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

function serverDocumentsUrl(
  openApi: OpenApiResponse | null | undefined,
  expectedUrl: string,
): boolean {
  const expected = normalizeBaseUrl(expectedUrl);

  return Boolean(
    expected &&
    openApi?.servers?.some(
      (server) => normalizeBaseUrl(server.url) === expected,
    ),
  );
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isBytes32(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
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

function stripHexPrefix(value: string): string {
  return value.startsWith("0x") ? value.slice(2) : value;
}

function shortHash(value: string): string {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
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
