import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

test("Railway dry run prints redacted secret variable commands", () => {
  const result = runScript("scripts/deploy-railway.ts", ["--create-domain"], {
    ARKSCORE_WEB_URL: "https://arkscore-seven.vercel.app",
    WAVY_NODE_API_KEY: "ApiKey super-secret-key",
    WAVY_NODE_PROJECT_ID: "project-secret-id",
    ARKSCORE_SUBJECT_HASH_SALT: "salt-secret-value",
    RAILWAY_PROJECT_ID: "project_123",
    RAILWAY_SERVICE: "arkscore-api",
    RAILWAY_ENVIRONMENT: "production",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Dry run/);
  assert.match(result.output, /variable set WAVY_NODE_API_KEY/);
  assert.match(result.output, /variable set WAVY_NODE_PROJECT_ID/);
  assert.match(result.output, /variable set ARKSCORE_SUBJECT_HASH_SALT/);
  assert.match(result.output, /echo '\[redacted\]' \|/);
  assert.match(result.output, /@railway\/cli up/);
  assert.match(result.output, /@railway\/cli domain/);
  assert.doesNotMatch(result.output, /super-secret-key/);
  assert.doesNotMatch(result.output, /project-secret-id/);
  assert.doesNotMatch(result.output, /salt-secret-value/);
});

test("Railway apply refuses missing live credentials unless mock is explicit", () => {
  const result = runScript("scripts/deploy-railway.ts", ["--apply"], {
    WAVY_NODE_API_KEY: "",
    WAVY_NODE_PROJECT_ID: "",
    ARKSCORE_SUBJECT_HASH_SALT: "",
    RAILWAY_ALLOW_MOCK: "false",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Refusing to deploy Railway API/);
  assert.doesNotMatch(result.output, /railway up/);
});

test("submission evidence can render without executing live checks", () => {
  const result = runScript("scripts/submission-evidence.ts", ["--skip-checks"]);

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /# ArkScore Submission Evidence/);
  assert.match(result.output, /Checks skipped with `--skip-checks`/);
  assert.match(result.output, /pnpm verify:live:strict/);
});

function runScript(
  scriptPath: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  const result = spawnSync("pnpm", ["exec", "tsx", scriptPath, ...args], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    status:
      typeof result.status === "number" ? result.status : result.error ? 1 : 0,
    output: [result.stdout, result.stderr].filter(Boolean).join("\n"),
  };
}
