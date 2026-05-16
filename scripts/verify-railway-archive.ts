import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import process from "node:process";

type Check = {
  detail: string;
  label: string;
  status: "pass" | "fail";
};

const keepArchive = process.argv.includes("--keep");
const root = process.cwd();
const payloadRoot = mkdtempSync(join(tmpdir(), "arkscore-railway-"));
const requiredEntries = [
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "railway.toml",
  ".railwayignore",
  "config/tsconfig/base.json",
  "config/tsconfig/node.json",
  "apps/api/package.json",
  "apps/api/src/server.ts",
  "apps/api/src/app.test.ts",
  "packages/shared/package.json",
  "packages/shared/src/index.ts",
];
const excludedEntries = [
  ".env",
  ".env.example",
  "apps/api/.env",
  "apps/api/.env.example",
  "apps/web",
  "packages/contracts",
  "docs",
  "node_modules",
];
const requiredIgnorePatterns = [
  "node_modules",
  "**/node_modules",
  ".env",
  ".env.*",
  "apps/web",
  "packages/contracts",
  "docs",
];
const requiredWatchPatterns = [
  "/apps/api/**",
  "/packages/shared/**",
  "/config/**",
];

main();

function main() {
  const checks: Check[] = [];

  console.log("# ArkScore Railway Archive Verification\n");

  try {
    copyRailwayPayload();
    checks.push(...checkRequiredEntries());
    checks.push(...checkExcludedEntries());
    checks.push(...checkRailwayIgnore());
    checks.push(...checkRailwayWatchPatterns());

    if (hasFailures(checks)) {
      printChecks(checks);
      process.exitCode = 1;
      return;
    }

    printChecks(checks);
    run("pnpm", ["install", "--frozen-lockfile"]);
    run("pnpm", ["--filter", "@arkscore/api", "build"]);
    run("pnpm", ["--filter", "@arkscore/api", "test"]);

    console.log("\n## Summary\n");
    console.log("- Passing: Railway payload install/build/test completed");
    console.log(`- Payload: ${keepArchive ? payloadRoot : "removed"}`);
  } finally {
    if (!keepArchive) {
      rmSync(payloadRoot, { force: true, recursive: true });
    }
  }
}

function copyRailwayPayload() {
  mkdirSync(payloadRoot, { recursive: true });

  for (const entry of readdirSync(root)) {
    copyEntry(join(root, entry), join(payloadRoot, entry));
  }
}

function copyEntry(source: string, destination: string) {
  const relativePath = normalizePath(relative(root, source));
  if (!relativePath || shouldExclude(relativePath)) return;

  const stat = lstatSync(source);

  if (stat.isDirectory()) {
    mkdirSync(destination, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyEntry(join(source, entry), join(destination, entry));
    }
    return;
  }

  if (!stat.isFile()) return;

  mkdirSync(dirname(destination), { recursive: true });
  cpSync(source, destination);
}

function shouldExclude(path: string) {
  const name = basename(path);
  const segments = path.split("/");

  return (
    path === "apps/web" ||
    path.startsWith("apps/web/") ||
    path === "packages/contracts" ||
    path.startsWith("packages/contracts/") ||
    path === "docs" ||
    path.startsWith("docs/") ||
    segments.includes(".git") ||
    segments.includes("node_modules") ||
    segments.includes(".next") ||
    segments.includes("out") ||
    segments.includes("artifacts") ||
    segments.includes("cache") ||
    segments.includes("typechain-types") ||
    name === ".env" ||
    name.startsWith(".env.") ||
    name.endsWith(".log") ||
    name.endsWith(".tsbuildinfo")
  );
}

function checkRequiredEntries(): Check[] {
  return requiredEntries.map((entry) =>
    existsSync(join(payloadRoot, entry))
      ? {
          label: "Required payload entry",
          status: "pass",
          detail: entry,
        }
      : {
          label: "Required payload entry",
          status: "fail",
          detail: `${entry} is missing from Railway payload`,
        },
  );
}

function checkExcludedEntries(): Check[] {
  return excludedEntries.map((entry) =>
    existsSync(join(payloadRoot, entry))
      ? {
          label: "Excluded payload entry",
          status: "fail",
          detail: `${entry} should be excluded by .railwayignore`,
        }
      : {
          label: "Excluded payload entry",
          status: "pass",
          detail: entry,
        },
  );
}

function checkRailwayIgnore(): Check[] {
  const railwayIgnore = readPayloadText(".railwayignore");
  const configuredPatterns = new Set(
    railwayIgnore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );

  return requiredIgnorePatterns.map((pattern) =>
    configuredPatterns.has(pattern)
      ? {
          label: "Railway ignore pattern",
          status: "pass",
          detail: pattern,
        }
      : {
          label: "Railway ignore pattern",
          status: "fail",
          detail: `${pattern} is missing from .railwayignore`,
        },
  );
}

function checkRailwayWatchPatterns(): Check[] {
  const railwayConfig = readPayloadText("railway.toml");

  return requiredWatchPatterns.map((pattern) =>
    railwayConfig.includes(`"${pattern}"`)
      ? {
          label: "Railway watch pattern",
          status: "pass",
          detail: pattern,
        }
      : {
          label: "Railway watch pattern",
          status: "fail",
          detail: `${pattern} is missing from railway.toml`,
        },
  );
}

function run(command: string, args: string[]) {
  console.log(`\n$ ${[command, ...args].join(" ")}`);
  const result = spawnSync(command, args, {
    cwd: payloadRoot,
    encoding: "utf8",
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n");

  if (output.trim()) {
    console.log(output.trim());
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function readPayloadText(path: string) {
  const filePath = join(payloadRoot, path);
  if (!existsSync(filePath)) return "";

  return readFileSync(filePath, "utf8");
}

function printChecks(checks: Check[]) {
  for (const check of checks) {
    console.log(`${icon(check.status)} ${check.label}: ${check.detail}`);
  }
}

function hasFailures(checks: Check[]) {
  return checks.some((check) => check.status === "fail");
}

function icon(status: Check["status"]) {
  return status === "pass" ? "[pass]" : "[fail]";
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}
