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
  };
  composite?: {
    creditScore?: number;
    decisionLabel?: string;
  };
};

type OpenApiResponse = {
  openapi?: string;
  info?: {
    title?: string;
  };
  paths?: Record<string, unknown>;
  components?: {
    schemas?: Record<string, unknown>;
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
  env.NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS ??
  readRegistryDeployment()?.address;
const fujiRpcUrl =
  env.FUJI_RPC_URL ?? "https://api.avax-test.network/ext/bc/C/rpc";
const testWallet =
  env.ARKSCORE_TEST_WALLET ?? "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const scorerAddress = env.ARKSCORE_SCORER_ADDRESS;

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  const checks: Check[] = [];

  checks.push(await verifyWeb(webUrl));
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

async function verifyWeb(url: string | undefined): Promise<Check> {
  if (!url) {
    return {
      label: "Vercel web",
      status: "warn",
      detail: "missing ARKSCORE_WEB_URL",
    };
  }

  try {
    const response = await fetch(url);
    const html = await response.text();

    if (!response.ok) {
      return {
        label: "Vercel web",
        status: "fail",
        detail: `${url} returned ${response.status}`,
      };
    }

    return html.includes("ArkScore")
      ? {
          label: "Vercel web",
          status: "pass",
          detail: `${url} returned ${response.status} and ArkScore HTML`,
        }
      : {
          label: "Vercel web",
          status: "fail",
          detail: `${url} returned ${response.status} but ArkScore text was missing`,
        };
  } catch (error) {
    return {
      label: "Vercel web",
      status: "fail",
      detail: error instanceof Error ? error.message : `could not reach ${url}`,
    };
  }
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
    } | null;

    checks.push(
      healthResponse.ok &&
        health?.ok === true &&
        health.service === "arkscore-api"
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
    const contractValid =
      openApiResponse.ok &&
      Boolean(openApi?.openapi?.match(/^3\./)) &&
      openApi.info?.title === "ArkScore API" &&
      Boolean(openApi.paths?.["/health"]) &&
      Boolean(openApi.paths?.["/api/score/{address}"]) &&
      Boolean(openApi.components?.schemas?.ScoreApiResponse) &&
      Boolean(openApi.components?.schemas?.WavyRiskResult);

    checks.push(
      contractValid
        ? {
            label: "Railway API OpenAPI",
            status: "pass",
            detail: `${url}/openapi.json documents health and score endpoints`,
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

  checks.push(...(await verifyScorer(address, scorerAddress)));

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

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

function isScore(value: unknown): boolean {
  return typeof value === "number" && value >= 0 && value <= 100;
}

function isEncodedAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

function decodeAddress(value: string): string {
  return `0x${value.slice(-40)}`;
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
