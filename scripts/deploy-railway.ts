import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

type CommandPlan = {
  command: string[];
  input?: string;
  redacted?: boolean;
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
const wavyMockMode = allowMock ? "true" : (env.WAVY_NODE_MOCK_MODE ?? "auto");

main();

function main() {
  console.log("# ArkScore Railway Deployment\n");

  const missingCredentials = [
    ["WAVY_NODE_API_KEY", wavyApiKey],
    ["WAVY_NODE_PROJECT_ID", wavyProjectId],
    ["ARKSCORE_SUBJECT_HASH_SALT", subjectHashSalt],
  ]
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

  if (apply && missingCredentials.length > 0 && !allowMock) {
    fail(
      "Refusing to deploy Railway API without live Wavy credentials and subject hash salt.",
    );
  }

  const commands = buildCommands();

  if (!apply) {
    console.log("Dry run. Re-run `pnpm deploy:railway:apply` to apply.\n");
    for (const plan of commands) printCommand(plan);
    console.log(
      "\nAfter Railway prints the service URL, run:\n" +
        "ARKSCORE_API_URL=https://your-railway-api.up.railway.app pnpm finalize:live",
    );
    return;
  }

  for (const plan of commands) run(plan);
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
  }

  const plainVariables: Record<string, string> = {
    PORT: env.PORT ?? "4000",
    ALLOWED_ORIGINS: webUrl,
    WAVY_NODE_BASE_URL: env.WAVY_NODE_BASE_URL ?? "https://api.wavynode.com/v1",
    WAVY_NODE_CHAIN_ID: env.WAVY_NODE_CHAIN_ID ?? "43113",
    WAVY_NODE_TIMEOUT_MS: env.WAVY_NODE_TIMEOUT_MS ?? "15000",
    WAVY_NODE_AUTO_REGISTER: env.WAVY_NODE_AUTO_REGISTER ?? "true",
    WAVY_NODE_FOREIGN_USER_PREFIX:
      env.WAVY_NODE_FOREIGN_USER_PREFIX ?? "arkscore-wallet",
    WAVY_NODE_MOCK_MODE: wavyMockMode,
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
    input: plan.input,
    encoding: "utf8",
    stdio:
      plan.input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function printCommand(plan: CommandPlan) {
  const rendered = plan.command.map(shellEscape).join(" ");
  const prefix = plan.input
    ? plan.redacted
      ? "echo '[redacted]' | "
      : `echo ${shellEscape(plan.input)} | `
    : "";

  console.log(`$ ${prefix}${rendered}`);
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

function hasUsableValue(value: string | undefined): value is string {
  return Boolean(
    value &&
    value.trim() &&
    !value.includes("replace_with") &&
    !value.includes("wavy_replace") &&
    !value.includes("your-"),
  );
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
