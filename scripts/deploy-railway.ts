import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type CommandPlan = {
  command: string[];
  env?: Record<string, string>;
  input?: string;
  redacted?: boolean;
  capturesRailwayApiUrl?: boolean;
};

const apply = process.argv.includes("--apply");
const createDomain = process.argv.includes("--create-domain");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("apps/api/.env"),
  ...process.env,
};
const projectName = env.RAILWAY_PROJECT_NAME ?? "arkscore-api";
const projectId = env.RAILWAY_PROJECT_ID;
const service = env.RAILWAY_SERVICE ?? "arkscore-api";
const environment = env.RAILWAY_ENVIRONMENT ?? "production";
const workspace = env.RAILWAY_WORKSPACE;
const webUrl = normalizeBaseUrl(
  env.ARKSCORE_WEB_URL ?? "https://arkscore-seven.vercel.app",
);
const wavyApiKey = env.WAVY_NODE_API_KEY;
const wavyProjectId = env.WAVY_NODE_PROJECT_ID;
const subjectHashSalt = env.ARKSCORE_SUBJECT_HASH_SALT;
const allowMock = env.RAILWAY_ALLOW_MOCK === "true";
const wavyMockMode = allowMock ? "true" : "false";
const fujiChainId = 43113;
const wavyChainId = parseWavyChainId(env.WAVY_NODE_CHAIN_ID);
const configuredApiUrl = normalizeBaseUrl(
  firstConfiguredValue([env.ARKSCORE_API_URL, env.NEXT_PUBLIC_API_BASE_URL]),
);
const liveVerifyTimeoutMs = parseDurationMs(
  env.RAILWAY_LIVE_VERIFY_TIMEOUT_MS,
  5 * 60 * 1000,
);
const liveVerifyIntervalMs = parseDurationMs(
  env.RAILWAY_LIVE_VERIFY_INTERVAL_MS,
  10 * 1000,
);

main();

function main() {
  console.log("# ArkScore Railway Deployment\n");

  const requiredCredentials: Array<[string, string | undefined]> = [
    ["WAVY_NODE_API_KEY", wavyApiKey],
    ["WAVY_NODE_PROJECT_ID", wavyProjectId],
    ["ARKSCORE_SUBJECT_HASH_SALT", subjectHashSalt],
  ];
  const missingCredentials = requiredCredentials
    .filter(([, value]) => !hasUsableValue(value))
    .map(([key]) => key);

  if (missingCredentials.length > 0 && !allowMock) {
    console.log(
      `[warn] Missing ${missingCredentials.join(", ")}. Apply mode requires live Wavy credentials and a subject hash salt.`,
    );
    console.log(
      "[warn] Set RAILWAY_ALLOW_MOCK=true only for temporary judge-demo mock deployments.\n",
    );
  }

  if (!allowMock && env.WAVY_NODE_MOCK_MODE === "true") {
    console.log(
      "[warn] Ignoring WAVY_NODE_MOCK_MODE=true. Railway live deployment forces WAVY_NODE_MOCK_MODE=false unless RAILWAY_ALLOW_MOCK=true.\n",
    );
  }

  if (wavyChainId !== fujiChainId) {
    fail(
      `WAVY_NODE_CHAIN_ID must be Avalanche Fuji chain id ${fujiChainId} for ArkScore deployment.`,
    );
  }

  if (apply && missingCredentials.length > 0 && !allowMock) {
    fail(
      "Refusing to deploy Railway API without live Wavy credentials and subject hash salt.",
    );
  }

  const preflightCommands = buildPreflightCommands(missingCredentials);
  const commands = buildCommands();

  if (!apply) {
    console.log("Dry run. Re-run `pnpm deploy:railway:apply` to apply.\n");
    for (const plan of preflightCommands) printCommand(plan);
    for (const plan of commands) printCommand(plan);
    console.log(
      "\nAfter Railway prints the service URL, run:\n" +
        "export ARKSCORE_API_URL=https://your-railway-api.up.railway.app\n" +
        "pnpm verify:railway:live\n\n" +
        "Apply mode also uses ARKSCORE_API_URL, NEXT_PUBLIC_API_BASE_URL, or the generated --create-domain output to retry `pnpm verify:railway:live` until the API is live.\n\n" +
        "Then deploy Fuji, authorize the scorer, record a live score, and run `pnpm finalize:live:apply`.",
    );
    return;
  }

  for (const plan of preflightCommands) run(plan);
  let generatedApiUrl: string | undefined;
  for (const plan of commands) {
    if (plan.capturesRailwayApiUrl) {
      const result = runCaptured(plan);
      if (result.status !== 0) {
        process.exit(result.status);
      }
      generatedApiUrl = extractRailwayApiUrl(result.output) ?? generatedApiUrl;
      continue;
    }

    run(plan);
  }

  const apiUrl = publicRailwayApiUrl(configuredApiUrl) ?? generatedApiUrl;

  if (!apiUrl) {
    if (configuredApiUrl) {
      console.log(
        `[warn] Ignoring non-public ARKSCORE_API_URL/NEXT_PUBLIC_API_BASE_URL=${configuredApiUrl}.`,
      );
    }
    console.log(
      "\n[warn] Railway API URL was not available for automatic live verification.",
    );
    console.log(
      "Set ARKSCORE_API_URL to the generated public Railway HTTPS URL, then run `pnpm verify:railway:live` before continuing to Fuji/Vercel finalization.",
    );
    return;
  }

  console.log(`\n[info] Railway API URL for live verification: ${apiUrl}`);
  waitForRailwayLiveVerification(apiUrl);
}

function buildPreflightCommands(missingCredentials: string[]): CommandPlan[] {
  const commands: CommandPlan[] = [
    {
      command: ["pnpm", "verify:railway"],
    },
  ];

  if (allowMock || missingCredentials.length > 0) return commands;

  commands.push({
    command: ["pnpm", "probe:wavy"],
    env: {
      WAVY_NODE_MOCK_MODE: "false",
      ...(wavyApiKey ? { WAVY_NODE_API_KEY: wavyApiKey } : {}),
      ...(wavyProjectId ? { WAVY_NODE_PROJECT_ID: wavyProjectId } : {}),
      ...(subjectHashSalt
        ? { ARKSCORE_SUBJECT_HASH_SALT: subjectHashSalt }
        : {}),
      WAVY_NODE_CHAIN_ID: String(wavyChainId),
    },
  });

  return commands;
}

function buildCommands(): CommandPlan[] {
  const commands: CommandPlan[] = [
    {
      command: railwayCommand("whoami", "--json"),
    },
  ];

  if (projectId) {
    commands.push({
      command: railwayCommand(
        "link",
        "--project",
        projectId,
        "--environment",
        environment,
        "--service",
        service,
        "--json",
      ),
    });
  } else {
    const initCommand = railwayCommand("init", "--name", projectName, "--json");

    if (workspace) {
      initCommand.push("--workspace", workspace);
    }

    commands.push({ command: initCommand });
    commands.push({
      command: railwayCommand("add", "--service", service, "--json"),
    });
  }

  const plainVariables: Record<string, string> = {
    PORT: env.PORT ?? "4000",
    ALLOWED_ORIGINS: webUrl,
    WAVY_NODE_BASE_URL: env.WAVY_NODE_BASE_URL ?? "https://api.wavynode.com/v1",
    WAVY_NODE_CHAIN_ID: String(wavyChainId),
    WAVY_NODE_TIMEOUT_MS: env.WAVY_NODE_TIMEOUT_MS ?? "15000",
    WAVY_NODE_AUTO_REGISTER: env.WAVY_NODE_AUTO_REGISTER ?? "true",
    WAVY_NODE_FOREIGN_USER_PREFIX:
      env.WAVY_NODE_FOREIGN_USER_PREFIX ?? "arkscore-wallet",
    WAVY_NODE_MOCK_MODE: wavyMockMode,
    ARKSCORE_SCORE_RATE_LIMIT_MAX: env.ARKSCORE_SCORE_RATE_LIMIT_MAX ?? "120",
    ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS:
      env.ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS ?? "60000",
  };

  for (const [key, value] of Object.entries(plainVariables)) {
    commands.push(variableSetCommand(`${key}=${value}`));
  }

  if (hasUsableValue(wavyApiKey)) {
    commands.push(variableSetCommand("WAVY_NODE_API_KEY", wavyApiKey, true));
  }

  if (hasUsableValue(wavyProjectId)) {
    commands.push(
      variableSetCommand("WAVY_NODE_PROJECT_ID", wavyProjectId, true),
    );
  }

  if (hasUsableValue(subjectHashSalt)) {
    commands.push(
      variableSetCommand("ARKSCORE_SUBJECT_HASH_SALT", subjectHashSalt, true),
    );
  }

  commands.push({
    command: railwayCommand(
      "up",
      "--detach",
      "--json",
      ...railwayTargetOptions(),
      "--message",
      "Deploy ArkScore API",
    ),
  });

  if (createDomain) {
    commands.push({
      command: railwayCommand("domain", ...railwayTargetOptions(), "--json"),
      capturesRailwayApiUrl: true,
    });
  } else {
    console.log(
      "[info] Add --create-domain to generate a Railway-provided service domain.",
    );
  }

  return commands;
}

function railwayCommand(...args: string[]) {
  return ["pnpm", "dlx", "@railway/cli", ...args];
}

function railwayTargetOptions() {
  return [
    ...(projectId ? ["--project", projectId] : []),
    "--environment",
    environment,
    "--service",
    service,
  ];
}

function variableSetCommand(
  value: string,
  stdinValue?: string,
  redacted = false,
): CommandPlan {
  if (stdinValue !== undefined) {
    return {
      command: railwayCommand(
        "variable",
        "set",
        value,
        ...railwayTargetOptions(),
        "--stdin",
        "--skip-deploys",
        "--json",
      ),
      input: stdinValue,
      redacted,
    };
  }

  return {
    command: railwayCommand(
      "variable",
      "set",
      value,
      ...railwayTargetOptions(),
      "--skip-deploys",
      "--json",
    ),
  };
}

function run(plan: CommandPlan) {
  printCommand(plan);
  const [binary, ...args] = plan.command;
  const result = spawnSync(binary, args, {
    env: plan.env ? { ...process.env, ...plan.env } : process.env,
    input: plan.input,
    encoding: "utf8",
    stdio:
      plan.input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runCaptured(plan: CommandPlan) {
  printCommand(plan);
  const [binary, ...args] = plan.command;
  const result = spawnSync(binary, args, {
    env: plan.env ? { ...process.env, ...plan.env } : process.env,
    input: plan.input,
    encoding: "utf8",
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (output.trim()) {
    console.log(output.trim());
  }

  return {
    status:
      typeof result.status === "number" ? result.status : result.error ? 1 : 0,
    output,
  };
}

function waitForRailwayLiveVerification(apiUrl: string) {
  const deadline = Date.now() + liveVerifyTimeoutMs;
  let attempt = 0;
  let lastOutput = "";

  while (true) {
    attempt += 1;
    console.log(
      `\n[info] Running pnpm verify:railway:live for ${apiUrl} (attempt ${attempt}).`,
    );
    const result = runCaptured({
      command: ["pnpm", "verify:railway:live"],
      env: { ARKSCORE_API_URL: apiUrl },
    });

    if (result.status === 0) {
      console.log("[pass] Railway live verification passed.");
      return;
    }

    lastOutput = result.output;

    if (Date.now() >= deadline) {
      if (lastOutput.trim()) {
        console.error(lastOutput.trim());
      }
      fail(
        `Timed out waiting for Railway live verification after ${liveVerifyTimeoutMs}ms.`,
      );
    }

    const waitMs = Math.min(liveVerifyIntervalMs, deadline - Date.now());
    console.log(
      `[warn] Railway live verification is not ready yet; retrying in ${waitMs}ms.`,
    );
    sleep(waitMs);
  }
}

function printCommand(plan: CommandPlan) {
  const rendered = plan.command.map(shellEscape).join(" ");
  const envPrefix = plan.env
    ? `${Object.entries(plan.env)
        .map(([key, value]) => {
          const renderedValue =
            key === "WAVY_NODE_API_KEY" ||
            key === "WAVY_NODE_PROJECT_ID" ||
            key === "ARKSCORE_SUBJECT_HASH_SALT"
              ? "[redacted]"
              : value;

          return `${key}=${shellEscape(renderedValue)}`;
        })
        .join(" ")} `
    : "";
  const prefix = plan.input
    ? plan.redacted
      ? "echo '[redacted]' | "
      : `echo ${shellEscape(plan.input)} | `
    : "";

  console.log(`$ ${prefix}${envPrefix}${rendered}`);
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

function normalizeBaseUrl(value: string | undefined): string {
  return (value ?? "").trim().replace(/\/$/, "");
}

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

function hasUsableValue(value: string | undefined): value is string {
  return Boolean(
    value &&
    value.trim() &&
    !value.includes("replace_with") &&
    !value.includes("wavy_replace") &&
    !value.includes("your-"),
  );
}

function parseWavyChainId(value: string | undefined): number {
  const chainId = Number(value ?? String(fujiChainId));

  if (!Number.isInteger(chainId) || chainId <= 0) {
    fail("WAVY_NODE_CHAIN_ID must be a positive integer.");
  }

  return chainId;
}

function publicRailwayApiUrl(value: string | undefined) {
  if (!value || !isPublicHttpsUrl(value)) return undefined;
  return value;
}

function extractRailwayApiUrl(output: string): string | undefined {
  const parsed = parseJson(output);
  const jsonUrl = parsed ? extractUrlFromValue(parsed) : undefined;
  if (jsonUrl) return jsonUrl;

  return extractUrlFromText(output);
}

function parseJson(output: string): unknown | undefined {
  const trimmed = output.trim();
  if (!trimmed) return undefined;

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function extractUrlFromValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizePublicUrlCandidate(value);
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractUrlFromValue(item);
      if (url) return url;
    }

    return undefined;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) {
      const url = extractUrlFromValue(item);
      if (url) return url;
    }
  }

  return undefined;
}

function extractUrlFromText(value: string): string | undefined {
  for (const match of value.matchAll(/https:\/\/[^\s"',)]+/g)) {
    const url = normalizePublicUrlCandidate(match[0] ?? "");
    if (url) return url;
  }

  for (const match of value.matchAll(
    /\b[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+\b/g,
  )) {
    const url = normalizePublicUrlCandidate(match[0] ?? "");
    if (url) return url;
  }

  return undefined;
}

function normalizePublicUrlCandidate(value: string): string | undefined {
  const candidate = value.trim().replace(/\/$/, "");
  if (!candidate) return undefined;
  const url = candidate.startsWith("https://")
    ? candidate
    : `https://${candidate}`;

  return isPublicHttpsUrl(url) ? url : undefined;
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

function parseDurationMs(value: string | undefined, fallback: number) {
  if (!value) return fallback;

  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) {
    fail("Railway live verification timeouts must be non-negative numbers.");
  }

  return duration;
}

function sleep(ms: number) {
  if (ms <= 0) return;

  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function shellEscape(value: string) {
  return /^[A-Za-z0-9_/:=.@-]+$/.test(value)
    ? value
    : `'${value.replaceAll("'", "'\\''")}'`;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}
