import { strict as assert } from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("root package exposes Railway CLI handoff scripts", () => {
  const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const railwayConfig = readFileSync("railway.toml", "utf8");
  const railwayArchiveVerifier = readFileSync(
    "scripts/verify-railway-archive.ts",
    "utf8",
  );

  assert.equal(
    packageJson.scripts["railway:login"],
    "pnpm dlx @railway/cli login",
  );
  assert.equal(
    packageJson.scripts["railway:login:browserless"],
    "pnpm dlx @railway/cli login --browserless",
  );
  assert.equal(
    packageJson.scripts["railway:whoami"],
    "pnpm dlx @railway/cli whoami",
  );
  assert.equal(
    packageJson.scripts["verify:railway"],
    "tsx scripts/verify-railway-archive.ts",
  );
  assert.match(packageJson.scripts.verify, /pnpm verify:railway/);
  assert.match(railwayConfig, /"\/config\/\*\*"/);
  assert.match(railwayArchiveVerifier, /pnpm", \["install"/);
  assert.match(railwayArchiveVerifier, /@arkscore\/api", "build"/);
  assert.match(railwayArchiveVerifier, /@arkscore\/api", "test"/);
});

test("web env example documents public deployment variables", () => {
  const webEnvExample = readFileSync("apps/web/.env.local.example", "utf8");

  assert.match(webEnvExample, /NEXT_PUBLIC_API_BASE_URL=/);
  assert.match(webEnvExample, /NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL=/);
  assert.match(webEnvExample, /NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS=/);
  assert.match(webEnvExample, /NEXT_PUBLIC_EERC20_DEMO_ADDRESS=/);
  assert.match(webEnvExample, /NEXT_PUBLIC_ENABLE_DEMO_FALLBACK=false/);
  assert.doesNotMatch(webEnvExample, /WAVY_NODE_API_KEY/);
  assert.doesNotMatch(webEnvExample, /FUJI_PRIVATE_KEY/);
});

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
  assert.match(result.output, /ARKSCORE_SCORE_RATE_LIMIT_MAX=120/);
  assert.match(result.output, /ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000/);
  assert.match(result.output, /pnpm probe:wavy/);
  assert.match(result.output, /WAVY_NODE_API_KEY='\[redacted\]'/);
  assert.match(result.output, /WAVY_NODE_PROJECT_ID='\[redacted\]'/);
  assert.match(result.output, /ARKSCORE_SUBJECT_HASH_SALT='\[redacted\]'/);
  assert.match(result.output, /echo '\[redacted\]' \|/);
  assert.match(result.output, /@railway\/cli up/);
  assert.match(result.output, /@railway\/cli domain/);
  assert.doesNotMatch(result.output, /super-secret-key/);
  assert.doesNotMatch(result.output, /project-secret-id/);
  assert.doesNotMatch(result.output, /salt-secret-value/);
});

test("Railway dry run skips Wavy probe for explicit mock deployment", () => {
  const result = runScript("scripts/deploy-railway.ts", [], {
    WAVY_NODE_API_KEY: "",
    WAVY_NODE_PROJECT_ID: "",
    ARKSCORE_SUBJECT_HASH_SALT: "",
    RAILWAY_ALLOW_MOCK: "true",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /WAVY_NODE_MOCK_MODE=true/);
  assert.doesNotMatch(result.output, /pnpm probe:wavy/);
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

test("submission evidence renders configured public deployment targets only", () => {
  const result = runScript(
    "scripts/submission-evidence.ts",
    ["--skip-checks"],
    {
      ARKSCORE_WEB_URL: "https://arkscore-demo.vercel.app/",
      ARKSCORE_API_URL: "",
      NEXT_PUBLIC_API_BASE_URL: "https://arkscore-api.up.railway.app/",
      ARKSCORE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
      ARKSCORE_EERC20_DEMO_ADDRESS:
        "0x3333333333333333333333333333333333333333",
      WAVY_NODE_API_KEY: "ApiKey should-not-print",
      FUJI_PRIVATE_KEY:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    },
  );

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    /Vercel frontend: https:\/\/arkscore-demo\.vercel\.app/,
  );
  assert.match(
    result.output,
    /Railway backend: https:\/\/arkscore-api\.up\.railway\.app/,
  );
  assert.match(
    result.output,
    /Avalanche Fuji `CreditScoreRegistry`: `0x1111111111111111111111111111111111111111`/,
  );
  assert.match(
    result.output,
    /Optional eERC20 demo contract: `0x3333333333333333333333333333333333333333`/,
  );
  assert.doesNotMatch(result.output, /should-not-print/);
  assert.doesNotMatch(result.output, /aaaaaaaaaaaaaaaa/);
});

test("submission evidence includes the latest Fuji score record proof", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-evidence-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");

  writeFileSync(
    artifactPath,
    JSON.stringify({
      transactionHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      blockNumber: 12345,
      subjectHash:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      institution: "bankaool",
      source: "wavy",
      chainId: 43113,
      wavy: {
        analysisId: "wavy-live-123",
        evidenceHash:
          "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
        riskScore: 18,
      },
      composite: {
        creditScore: 82,
        decision: "APPROVE_BANKAOOL_LOAN",
      },
    }),
  );

  try {
    const result = runScript(
      "scripts/submission-evidence.ts",
      ["--skip-checks"],
      {
        ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
      },
    );

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /Latest Fuji score record/);
    assert.match(result.output, /wavy-live-123/);
    assert.match(result.output, /APPROVE_BANKAOOL_LOAN/);
    assert.match(result.output, /Scores: Wavy `18\/100`, composite `82\/100`/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("readiness reports a configured latest Fuji score record proof", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-readiness-record-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const scorerAddress = "0x4444444444444444444444444444444444444444";

  writeFileSync(
    artifactPath,
    JSON.stringify({
      generatedAt: "2026-05-16T00:00:00.000Z",
      registryAddress,
      scorerAddress,
      subjectHash:
        "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      institution: "bankaool",
      source: "wavy",
      chainId: 43113,
      transactionHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
      blockNumber: 12345,
      wavy: {
        analysisId: "wavy-live-123",
        evidenceHash:
          "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        riskScore: 18,
      },
      composite: {
        creditScore: 82,
        decision: "APPROVE_BANKAOOL_LOAN",
        decisionEnum: 2,
      },
      stored: {
        submitter: scorerAddress,
        updatedAt: "1710000000",
      },
    }),
  );

  try {
    const result = runScript(
      "scripts/readiness-check.ts",
      ["--skip-external"],
      {
        ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
        ARKSCORE_REGISTRY_ADDRESS: registryAddress,
        ARKSCORE_SCORER_ADDRESS: scorerAddress,
      },
    );

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /\[pass\] Latest Fuji score record:/);
    assert.match(result.output, /Wavy 18\/100, composite 82\/100/);
    assert.match(
      result.output,
      /0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc/,
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("readiness strict record warns when the score record proof is missing", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-readiness-missing-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");

  try {
    const result = runScript(
      "scripts/readiness-check.ts",
      ["--skip-external", "--strict", "--require-score-record"],
      {
        ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
      },
    );

    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /\[warn\] Latest Fuji score record:/);
    assert.match(result.output, /run pnpm record:fuji first/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("readiness treats the default score record artifact path as optional until strict record", () => {
  const result = runScript("scripts/readiness-check.ts", ["--skip-external"], {
    ARKSCORE_SCORE_RECORD_ARTIFACT:
      "packages/contracts/deployments/fuji/LatestScoreRecord.json",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /\[pass\] Latest Fuji score record:/);
  assert.match(result.output, /not configured yet; run pnpm record:fuji/);
  assert.doesNotMatch(result.output, /LatestScoreRecord\.json is missing/);
});

test("requirements audit maps repo readiness without leaking secrets", () => {
  const result = runScript("scripts/audit-requirements.ts", [], {
    WAVY_NODE_API_KEY: "ApiKey should-not-print",
    FUJI_PRIVATE_KEY:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /ArkScore Requirements Audit/);
  assert.match(result.output, /\[pass\] Next.js 15 App Router frontend:/);
  assert.match(
    result.output,
    /\[pass\] Wavy Node traceability and AI risk score:/,
  );
  assert.match(result.output, /\[warn\] Railway live deployment proof:/);
  assert.doesNotMatch(result.output, /should-not-print/);
  assert.doesNotMatch(result.output, /aaaaaaaaaaaaaaaa/);
});

test("requirements audit strict mode fails while live proof is missing", () => {
  const result = runScript("scripts/audit-requirements.ts", ["--strict"], {
    ARKSCORE_API_URL: "",
    NEXT_PUBLIC_API_BASE_URL: "",
    WAVY_NODE_API_KEY: "",
    WAVY_NODE_PROJECT_ID: "",
    ARKSCORE_SUBJECT_HASH_SALT: "",
    ARKSCORE_REGISTRY_ADDRESS: "",
    CREDIT_SCORE_REGISTRY_ADDRESS: "",
    REGISTRY_ADDRESS: "",
    NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS: "",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Railway live deployment proof/);
  assert.match(result.output, /Live Wavy credential proof/);
  assert.match(result.output, /Fuji registry deployment proof/);
});

test("judge demo runbook renders fallback blockers without leaking secrets", () => {
  const result = runScript("scripts/judge-demo.ts", [], {
    WAVY_NODE_API_KEY: "ApiKey should-not-print",
    FUJI_PRIVATE_KEY:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ARKSCORE_WEB_URL: "https://arkscore-demo.vercel.app/",
    ARKSCORE_API_URL: "",
    NEXT_PUBLIC_API_BASE_URL: "",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /ArkScore Judge Demo Runbook/);
  assert.match(result.output, /https:\/\/arkscore-demo\.vercel\.app/);
  assert.match(result.output, /hosted fallback demo/);
  assert.match(result.output, /Three-Minute Walkthrough/);
  assert.match(result.output, /pnpm railway:whoami/);
  assert.match(result.output, /Railway API URL is missing/);
  assert.doesNotMatch(result.output, /should-not-print/);
  assert.doesNotMatch(result.output, /aaaaaaaaaaaaaaaa/);
});

test("judge demo runbook renders live proof mode when configured", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-judge-demo-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");

  writeFileSync(artifactPath, "{}");

  try {
    const result = runScript("scripts/judge-demo.ts", [], {
      ARKSCORE_API_URL: "https://arkscore-api.up.railway.app/",
      ARKSCORE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
      ARKSCORE_SCORER_ADDRESS: "0x4444444444444444444444444444444444444444",
      ARKSCORE_EERC20_DEMO_ADDRESS:
        "0x3333333333333333333333333333333333333333",
      ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
      WAVY_NODE_API_KEY: "ApiKey live-key",
      WAVY_NODE_PROJECT_ID: "project-live",
      ARKSCORE_SUBJECT_HASH_SALT: "production-subject-hash-salt-for-judge-demo",
      FUJI_PRIVATE_KEY:
        "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /final live oracle proof path/);
    assert.match(
      result.output,
      /Optional eERC20: 0x3333333333333333333333333333333333333333/,
    );
    assert.match(result.output, /None detected by local configuration/);
    assert.match(result.output, /verify:live:strict:eerc20:record/);
    assert.doesNotMatch(result.output, /live-key/);
    assert.doesNotMatch(result.output, /bbbbbbbbbbbbbbbb/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("submission evidence renders strict eERC20 handoff when required", () => {
  const result = runScript(
    "scripts/submission-evidence.ts",
    ["--skip-checks"],
    {
      ARKSCORE_REQUIRE_EERC20: "true",
      ARKSCORE_EERC20_DEMO_ADDRESS:
        "0x3333333333333333333333333333333333333333",
    },
  );

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /pnpm probe:eerc20:strict/);
  assert.match(result.output, /ARKSCORE_REQUIRE_EERC20=true pnpm finalize/);
  assert.match(result.output, /pnpm verify:live:strict:eerc20:record/);
  assert.doesNotMatch(result.output, /^pnpm probe:eerc20$/m);
  assert.doesNotMatch(result.output, /^pnpm verify:live:strict$/m);
});

test("Vercel finalizer dry run prints public env and strict verification commands", () => {
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const eerc20DemoAddress = "0x3333333333333333333333333333333333333333";
  const scorerAddress = "0x4444444444444444444444444444444444444444";
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: `${apiUrl}/`,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress,
    ARKSCORE_SCORER_ADDRESS: scorerAddress,
    VERCEL_SCOPE: "arkscore-scope",
    VERCEL_PROJECT_NAME: "arkscore-project",
    WAVY_NODE_API_KEY: "ApiKey should-not-print",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Dry run/);
  assert.match(result.output, /vercel whoami/);
  assert.match(result.output, /vercel link --yes --project arkscore-project/);
  assert.match(
    result.output,
    new RegExp(`NEXT_PUBLIC_API_BASE_URL production --value ${apiUrl}`),
  );
  assert.match(
    result.output,
    new RegExp(
      `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS production --value ${registryAddress}`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `NEXT_PUBLIC_EERC20_DEMO_ADDRESS production --value ${eerc20DemoAddress}`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} pnpm probe:eerc20`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_API_URL=${apiUrl} ARKSCORE_REGISTRY_ADDRESS=${registryAddress} ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} ARKSCORE_SCORER_ADDRESS=${scorerAddress} pnpm verify:live:preflight`,
    ),
  );
  assert.match(
    result.output,
    /NEXT_PUBLIC_ENABLE_DEMO_FALLBACK production --value false/,
  );
  assert.match(result.output, /vercel deploy \. --prod/);
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_API_URL=${apiUrl} ARKSCORE_REGISTRY_ADDRESS=${registryAddress} ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} ARKSCORE_SCORER_ADDRESS=${scorerAddress} pnpm verify:live:strict`,
    ),
  );
  assert.doesNotMatch(result.output, /should-not-print/);
});

test("Vercel finalizer ignores empty primary aliases and uses fallback env", () => {
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const scorerAddress = "0x4444444444444444444444444444444444444444";
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: "",
    NEXT_PUBLIC_API_BASE_URL: `${apiUrl}/`,
    ARKSCORE_REGISTRY_ADDRESS: "",
    CREDIT_SCORE_REGISTRY_ADDRESS: registryAddress,
    ARKSCORE_SCORER_ADDRESS: "",
    SCORER_ADDRESS: scorerAddress,
    ARKSCORE_WEB_URL: "",
    VERCEL_SCOPE: "arkscore-scope",
    VERCEL_PROJECT_NAME: "arkscore-project",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    new RegExp(`NEXT_PUBLIC_API_BASE_URL production --value ${apiUrl}`),
  );
  assert.match(
    result.output,
    new RegExp(
      `NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS production --value ${registryAddress}`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_API_URL=${apiUrl} ARKSCORE_REGISTRY_ADDRESS=${registryAddress} ARKSCORE_SCORER_ADDRESS=${scorerAddress} pnpm verify:live:preflight`,
    ),
  );
  assert.doesNotMatch(result.output, /Missing ARKSCORE_API_URL/);
  assert.doesNotMatch(result.output, /Missing registry address/);
});

test("Vercel finalizer dry run prints strict eERC20 verification when required", () => {
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const eerc20DemoAddress = "0x3333333333333333333333333333333333333333";
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: `${apiUrl}/`,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress,
    ARKSCORE_REQUIRE_EERC20: "true",
    VERCEL_SCOPE: "arkscore-scope",
    VERCEL_PROJECT_NAME: "arkscore-project",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    new RegExp(
      `NEXT_PUBLIC_EERC20_DEMO_ADDRESS production --value ${eerc20DemoAddress}`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} ARKSCORE_REQUIRE_EERC20=true pnpm probe:eerc20:strict`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_API_URL=${apiUrl} ARKSCORE_REGISTRY_ADDRESS=${registryAddress} ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} ARKSCORE_REQUIRE_EERC20=true pnpm verify:live:preflight`,
    ),
  );
  assert.match(
    result.output,
    new RegExp(
      `ARKSCORE_API_URL=${apiUrl} ARKSCORE_REGISTRY_ADDRESS=${registryAddress} ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} ARKSCORE_REQUIRE_EERC20=true pnpm verify:live:strict:eerc20`,
    ),
  );
  assert.doesNotMatch(result.output, /pnpm verify:live:strict$/m);
});

test("Vercel finalizer dry run uses record verification when artifact is configured", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-finalize-record-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";

  writeFileSync(artifactPath, "{}");

  try {
    const result = runScript("scripts/finalize-live.ts", [], {
      ARKSCORE_API_URL: `${apiUrl}/`,
      ARKSCORE_REGISTRY_ADDRESS: registryAddress,
      ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
      VERCEL_SCOPE: "arkscore-scope",
      VERCEL_PROJECT_NAME: "arkscore-project",
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /pnpm verify:live:preflight:record/);
    assert.match(result.output, /ARKSCORE_REQUIRE_SCORE_RECORD=true/);
    assert.match(result.output, /pnpm verify:live:strict:record/);
    assert.doesNotMatch(result.output, /pnpm verify:live:strict$/m);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Vercel finalizer does not require the missing default score record path", () => {
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: apiUrl,
    ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    ARKSCORE_SCORE_RECORD_ARTIFACT:
      "packages/contracts/deployments/fuji/LatestScoreRecord.json",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /pnpm verify:live:preflight/);
  assert.match(result.output, /pnpm verify:live:strict/);
  assert.doesNotMatch(result.output, /preflight:record/);
  assert.doesNotMatch(result.output, /strict:record/);
  assert.doesNotMatch(result.output, /Missing latest score record artifact/);
});

test("Vercel finalizer dry run uses eERC20 record verification when both are required", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-finalize-eerc20-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");
  const apiUrl = "https://arkscore-api.up.railway.app";
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const eerc20DemoAddress = "0x3333333333333333333333333333333333333333";

  writeFileSync(artifactPath, "{}");

  try {
    const result = runScript("scripts/finalize-live.ts", [], {
      ARKSCORE_API_URL: `${apiUrl}/`,
      ARKSCORE_REGISTRY_ADDRESS: registryAddress,
      ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress,
      ARKSCORE_REQUIRE_EERC20: "true",
      ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
      VERCEL_SCOPE: "arkscore-scope",
      VERCEL_PROJECT_NAME: "arkscore-project",
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /pnpm verify:live:preflight:record/);
    assert.match(result.output, /ARKSCORE_REQUIRE_EERC20=true/);
    assert.match(result.output, /ARKSCORE_REQUIRE_SCORE_RECORD=true/);
    assert.match(result.output, /pnpm verify:live:strict:eerc20:record/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Vercel finalizer refuses a missing required score record artifact", () => {
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: "https://arkscore-api.up.railway.app",
    ARKSCORE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
    ARKSCORE_REQUIRE_SCORE_RECORD: "true",
    ARKSCORE_SCORE_RECORD_ARTIFACT: "/tmp/arkscore-missing-record.json",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing latest score record artifact/);
  assert.doesNotMatch(result.output, /vercel deploy/);
});

test("Vercel finalizer refuses missing API URL before printing deploy commands", () => {
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: "",
    NEXT_PUBLIC_API_BASE_URL: "",
    ARKSCORE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing ARKSCORE_API_URL/);
  assert.doesNotMatch(result.output, /vercel deploy/);
});

test("Vercel finalizer refuses invalid registry address", () => {
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: "https://arkscore-api.up.railway.app",
    ARKSCORE_REGISTRY_ADDRESS: "not-a-contract-address",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing registry address/);
  assert.doesNotMatch(result.output, /vercel env add/);
});

test("Vercel finalizer refuses a missing required eERC20 demo address", () => {
  const result = runScript("scripts/finalize-live.ts", [], {
    ARKSCORE_API_URL: "https://arkscore-api.up.railway.app",
    ARKSCORE_REGISTRY_ADDRESS: "0x1111111111111111111111111111111111111111",
    ARKSCORE_EERC20_DEMO_ADDRESS: "",
    EERC20_DEMO_ADDRESS: "",
    NEXT_PUBLIC_EERC20_DEMO_ADDRESS: "",
    ARKSCORE_REQUIRE_EERC20: "true",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing eERC20 demo address/);
  assert.doesNotMatch(result.output, /vercel env add/);
});

test("eERC20 probe is optional by default when no address is configured", () => {
  const result = runScript("scripts/probe-eerc20.ts", [], {
    ARKSCORE_EERC20_DEMO_ADDRESS: "",
    EERC20_DEMO_ADDRESS: "",
    NEXT_PUBLIC_EERC20_DEMO_ADDRESS: "",
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Optional eERC20 demo address is not configured/);
});

test("eERC20 planner prints official Fuji handoff commands without secrets", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-eerc20-plan-"));
  const missingRepoDir = join(tempDir, "EncryptedERC");
  const result = runScript("scripts/plan-eerc20.ts", [], {
    EERC20_REPO_DIR: missingRepoDir,
    FUJI_PRIVATE_KEY:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  });

  try {
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /ArkScore eERC20 Handoff Planner/);
    assert.match(result.output, /github\.com\/ava-labs\/EncryptedERC\.git/);
    assert.match(
      result.output,
      /scripts\/deploy-standalone\.ts --network fuji/,
    );
    assert.match(result.output, /pnpm probe:eerc20:strict/);
    assert.match(result.output, /Fuji deployer key: configured and redacted/);
    assert.doesNotMatch(result.output, /aaaaaaaaaaaaaaaa/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("eERC20 planner recognizes a local EncryptedERC Fuji checkout", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-eerc20-repo-"));

  writeFileSync(join(tempDir, "package.json"), "{}");
  mkdirSync(join(tempDir, "scripts"), { recursive: true });
  writeFileSync(join(tempDir, "scripts", "deploy-standalone.ts"), "");
  writeFileSync(join(tempDir, "scripts", "deploy-converter.ts"), "");
  writeFileSync(
    join(tempDir, "hardhat.config.ts"),
    "export default { networks: { fuji: { chainId: 43113 } } };",
  );

  try {
    const result = runScript("scripts/plan-eerc20.ts", [], {
      EERC20_REPO_DIR: tempDir,
      EERC20_MODE: "converter",
      ARKSCORE_EERC20_DEMO_ADDRESS:
        "0x3333333333333333333333333333333333333333",
    });

    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /\[pass\] Local EncryptedERC checkout:/);
    assert.match(result.output, /Fuji chain id 43113/);
    assert.match(result.output, /scripts\/deploy-converter\.ts --network fuji/);
    assert.match(result.output, /0x3333333333333333333333333333333333333333/);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("eERC20 strict probe refuses a missing optional demo address", () => {
  const result = runScript("scripts/probe-eerc20.ts", ["--strict"], {
    ARKSCORE_EERC20_DEMO_ADDRESS: "",
    EERC20_DEMO_ADDRESS: "",
    NEXT_PUBLIC_EERC20_DEMO_ADDRESS: "",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /Missing optional eERC20 demo address/);
});

test("eERC20 probe verifies deployed Fuji bytecode", async () => {
  const result = await runEerc20ProbeWithMockRpc();

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Connected to Avalanche Fuji/);
  assert.match(result.output, /has deployed bytecode/);
  assert.match(result.output, /NEXT_PUBLIC_EERC20_DEMO_ADDRESS/);
});

test("eERC20 probe fails when the configured address has no Fuji bytecode", async () => {
  const result = await runEerc20ProbeWithMockRpc({ code: "0x" });

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /has no deployed bytecode on Fuji/);
});

test("live verifier fails when eERC20 is required but missing", async () => {
  const webServer = await listen((request, response) => {
    if (request.url === "/bundle.js") {
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end("window.arkscore=true");
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<main>ArkScore</main><script src="/bundle.js"></script>`);
  });

  try {
    const result = await runScriptAsync("scripts/verify-live.ts", [], {
      ARKSCORE_WEB_URL: webServer.url,
      ARKSCORE_REQUIRE_EERC20: "true",
      ARKSCORE_API_URL: "",
      NEXT_PUBLIC_API_BASE_URL: "",
      ARKSCORE_REGISTRY_ADDRESS: "",
      CREDIT_SCORE_REGISTRY_ADDRESS: "",
      REGISTRY_ADDRESS: "",
      NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS: "",
      ARKSCORE_EERC20_DEMO_ADDRESS: "",
      EERC20_DEMO_ADDRESS: "",
      NEXT_PUBLIC_EERC20_DEMO_ADDRESS: "",
    });

    assert.equal(result.status, 1, result.output);
    assert.match(result.output, /Optional eERC20 demo contract/);
    assert.match(result.output, /ARKSCORE_REQUIRE_EERC20=true/);
  } finally {
    await webServer.close();
  }
});

test("Fuji registry deployer refuses missing private key before deployment", () => {
  const result = runPnpm(
    [
      "--filter",
      "@arkscore/contracts",
      "exec",
      "hardhat",
      "run",
      "scripts/deploy-credit-score-registry.ts",
    ],
    { FUJI_PRIVATE_KEY: "" },
  );

  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /FUJI_PRIVATE_KEY is required/);
  assert.doesNotMatch(result.output, /CreditScoreRegistry deployed/);
});

test("Fuji registry deployer refuses malformed private key with project error", () => {
  const result = runPnpm(
    [
      "--filter",
      "@arkscore/contracts",
      "exec",
      "hardhat",
      "run",
      "scripts/deploy-credit-score-registry.ts",
    ],
    { FUJI_PRIVATE_KEY: "0x1234" },
  );

  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /FUJI_PRIVATE_KEY must be a 32-byte 0x-prefixed hex private key/,
  );
  assert.doesNotMatch(result.output, /Invalid config/);
  assert.doesNotMatch(result.output, /CreditScoreRegistry deployed/);
});

test("live verifier proves registry getScore readback ABI", async () => {
  const result = await runLiveVerifierWithMockRegistry();

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    /Fuji registry bytecode: .*has deployed bytecode/,
  );
  assert.match(
    result.output,
    /Fuji registry hasScore ABI: hasScore\(bytes32\) returned false/,
  );
  assert.match(
    result.output,
    /Fuji registry getScore ABI: getScore\(bytes32\) reverted with MissingScore\(\)/,
  );
});

test("live verifier proves the latest Fuji score record artifact", async () => {
  const result = await runLiveVerifierWithMockScoreRecord();

  assert.equal(result.status, 0, result.output);
  assert.match(
    result.output,
    /Fuji score record proof: .*LatestScoreRecord\.json matches on-chain getScore/,
  );
});

test("live verifier fails when the latest Fuji score record differs on-chain", async () => {
  const result = await runLiveVerifierWithMockScoreRecord({
    storedEvidenceHash:
      "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Fuji score record proof: .*wavyEvidenceHash does not match on-chain getScore/,
  );
});

test("live verifier preflight skips Vercel and proves API plus registry", async () => {
  const result = await runLivePreflightVerifierWithMocks();

  assert.equal(result.status, 0, result.output);
  assert.doesNotMatch(result.output, /Vercel web/);
  assert.match(result.output, /Railway API health: .*returned ok/);
  assert.match(
    result.output,
    /Railway API score: live Wavy Node response; Bankaool score response is valid, no-store, and rate-limited/,
  );
  assert.match(
    result.output,
    /Fuji scorer authorization: 0x4444444444444444444444444444444444444444 is authorized/,
  );
});

test("live verifier preflight ignores empty primary aliases", async () => {
  const result = await runLivePreflightVerifierWithMocks({
    useFallbackAliases: true,
  });

  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /Railway API health: .*returned ok/);
  assert.match(
    result.output,
    /Fuji registry bytecode: .*has deployed bytecode/,
  );
  assert.doesNotMatch(
    result.output,
    /missing ARKSCORE_API_URL or NEXT_PUBLIC_API_BASE_URL/,
  );
  assert.doesNotMatch(
    result.output,
    /missing ARKSCORE_REGISTRY_ADDRESS or NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS/,
  );
});

test("live verifier fails when registry hasScore ABI returns malformed data", async () => {
  const result = await runLiveVerifierWithMockRegistry({
    hasScoreResult: "0x1234",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Fuji registry hasScore ABI: hasScore\(bytes32\) did not return an encoded bool/,
  );
});

test("live verifier fails when registry getScore ABI returns a zero-hash record", async () => {
  const result = await runLiveVerifierWithMockRegistry({
    getScoreBehavior: "record",
  });

  assert.equal(result.status, 1, result.output);
  assert.match(
    result.output,
    /Fuji registry getScore ABI: getScore\(bytes32\) unexpectedly returned a record for zero hash/,
  );
});

function runScript(
  scriptPath: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  return runPnpm(["exec", "tsx", scriptPath, ...args], env);
}

function runPnpm(args: string[] = [], env: Record<string, string> = {}) {
  const result = spawnSync("pnpm", args, {
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

function runScriptAsync(
  scriptPath: string,
  args: string[] = [],
  env: Record<string, string> = {},
) {
  return new Promise<{ status: number; output: string }>((resolve) => {
    const subprocess = spawn("pnpm", ["exec", "tsx", scriptPath, ...args], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...env,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";

    subprocess.stdout.on("data", (chunk: unknown) => {
      output += String(chunk);
    });
    subprocess.stderr.on("data", (chunk: unknown) => {
      output += String(chunk);
    });
    subprocess.on("close", (code) => {
      resolve({
        status: code ?? 1,
        output,
      });
    });
  });
}

async function listen(
  handler: (
    request: IncomingMessage,
    response: ServerResponse,
  ) => void | Promise<void>,
) {
  const server = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Expected server to listen on a TCP port.");
  }
  assert.ok(address);

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function readJson(request: IncomingMessage) {
  let body = "";

  for await (const chunk of request) {
    body += String(chunk);
  }

  return JSON.parse(body) as unknown;
}

type Eerc20RpcOptions = {
  chainId?: string;
  code?: string;
};

async function runEerc20ProbeWithMockRpc(options: Eerc20RpcOptions = {}) {
  const eerc20DemoAddress = "0x3333333333333333333333333333333333333333";
  const rpcServer = await listen(async (request, response) => {
    const body = (await readJson(request)) as {
      id?: number;
      method?: string;
    };

    response.writeHead(200, { "content-type": "application/json" });

    if (body.method === "eth_chainId") {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: options.chainId ?? "0xa869",
        }),
      );
      return;
    }

    if (body.method === "eth_getCode") {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: options.code ?? "0x6000",
        }),
      );
      return;
    }

    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not mocked" },
      }),
    );
  });

  try {
    return await runScriptAsync("scripts/probe-eerc20.ts", [], {
      FUJI_RPC_URL: rpcServer.url,
      ARKSCORE_EERC20_DEMO_ADDRESS: eerc20DemoAddress,
      EERC20_DEMO_ADDRESS: "",
      NEXT_PUBLIC_EERC20_DEMO_ADDRESS: "",
    });
  } finally {
    await rpcServer.close();
  }
}

type RegistryRpcOptions = {
  getScoreBehavior?: "missing-score" | "record" | "wrong-error";
  hasScoreResult?: string;
};

async function runLiveVerifierWithMockRegistry(
  options: RegistryRpcOptions = {},
) {
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const webServer = await listen((request, response) => {
    if (request.url === "/bundle.js") {
      response.writeHead(200, { "content-type": "application/javascript" });
      response.end(`window.registry="${registryAddress}"`);
      return;
    }

    response.writeHead(200, { "content-type": "text/html" });
    response.end(`<main>ArkScore</main><script src="/bundle.js"></script>`);
  });
  const rpcServer = await listen(async (request, response) => {
    const body = (await readJson(request)) as {
      id?: number;
      method?: string;
      params?: Array<{ data?: string } | string>;
    };
    const data =
      body.params?.[0] && typeof body.params[0] === "object"
        ? body.params[0].data
        : undefined;

    response.writeHead(200, { "content-type": "application/json" });

    if (body.method === "eth_getCode") {
      response.end(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x6000" }),
      );
      return;
    }

    if (body.method === "eth_call" && data === "0x8da5cb5b") {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeAddress("0x2222222222222222222222222222222222222222"),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x92b8c652")) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: options.hasScoreResult ?? encodeBool(false),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x7ba53285")) {
      if (options.getScoreBehavior === "record") {
        response.end(
          JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x00" }),
        );
        return;
      }

      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: 3,
            message: "execution reverted",
            data:
              options.getScoreBehavior === "wrong-error"
                ? "0xdeadbeef"
                : "0xe5fa9471",
          },
        }),
      );
      return;
    }

    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not mocked" },
      }),
    );
  });

  try {
    return await runScriptAsync("scripts/verify-live.ts", [], {
      ARKSCORE_WEB_URL: webServer.url,
      FUJI_RPC_URL: rpcServer.url,
      ARKSCORE_REGISTRY_ADDRESS: registryAddress,
    });
  } finally {
    await webServer.close();
    await rpcServer.close();
  }
}

type ScoreRecordRpcOptions = {
  storedEvidenceHash?: string;
};

async function runLiveVerifierWithMockScoreRecord(
  options: ScoreRecordRpcOptions = {},
) {
  const tempDir = mkdtempSync(join(tmpdir(), "arkscore-score-record-"));
  const artifactPath = join(tempDir, "LatestScoreRecord.json");
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const scorerAddress = "0x4444444444444444444444444444444444444444";
  const subjectHash =
    "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const evidenceHash =
    "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const storedEvidenceHash = options.storedEvidenceHash ?? evidenceHash;
  const artifact = {
    generatedAt: "2026-05-16T00:00:00.000Z",
    apiUrl: "https://arkscore-api.up.railway.app",
    registryAddress,
    scorerAddress,
    subjectHash,
    requestedWallet: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    institution: "bankaool",
    source: "wavy",
    chainId: 43113,
    transactionHash:
      "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    blockNumber: 12345,
    previousRecord: false,
    wavy: {
      analysisId: "wavy-live-123",
      riskScore: 18,
      evidenceHash,
    },
    composite: {
      creditScore: 82,
      decision: "APPROVE_BANKAOOL_LOAN",
      decisionEnum: 2,
    },
    stored: {
      submitter: scorerAddress,
      updatedAt: "1710000000",
    },
  };

  writeFileSync(artifactPath, JSON.stringify(artifact));

  const rpcServer = await listen(async (request, response) => {
    const body = (await readJson(request)) as {
      id?: number;
      method?: string;
      params?: Array<{ data?: string } | string>;
    };
    const data =
      body.params?.[0] && typeof body.params[0] === "object"
        ? body.params[0].data
        : undefined;

    response.writeHead(200, { "content-type": "application/json" });

    if (body.method === "eth_getCode") {
      response.end(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x6000" }),
      );
      return;
    }

    if (body.method === "eth_call" && data === "0x8da5cb5b") {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeAddress("0x2222222222222222222222222222222222222222"),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x73c4502c")) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeBool(true),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x92b8c652")) {
      const encodedSubject = data.slice(10);
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeBool(encodedSubject === subjectHash.slice(2)),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x7ba53285")) {
      const encodedSubject = data.slice(10);

      if (encodedSubject === subjectHash.slice(2)) {
        response.end(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: encodeScoreRecord({
              subjectHash,
              wavyRiskScore: 18,
              compositeCreditScore: 82,
              decision: 2,
              evidenceHash: storedEvidenceHash,
              analysisId: "wavy-live-123",
              institution: "bankaool",
              updatedAt: 1710000000n,
              submitter: scorerAddress,
            }),
          }),
        );
        return;
      }

      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: 3,
            message: "execution reverted",
            data: "0xe5fa9471",
          },
        }),
      );
      return;
    }

    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not mocked" },
      }),
    );
  });

  try {
    return await runScriptAsync(
      "scripts/verify-live.ts",
      ["--skip-web", "--skip-api", "--strict", "--require-score-record"],
      {
        ARKSCORE_SCORE_RECORD_ARTIFACT: artifactPath,
        ARKSCORE_REGISTRY_ADDRESS: registryAddress,
        ARKSCORE_SCORER_ADDRESS: scorerAddress,
        FUJI_RPC_URL: rpcServer.url,
      },
    );
  } finally {
    await rpcServer.close();
    rmSync(tempDir, { recursive: true, force: true });
  }
}

async function runLivePreflightVerifierWithMocks(
  options: { useFallbackAliases?: boolean } = {},
) {
  const registryAddress = "0x1111111111111111111111111111111111111111";
  const scorerAddress = "0x4444444444444444444444444444444444444444";
  const apiServer = await listen((request, response) => {
    const path = request.url?.split("?")[0];

    if (path === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          ok: true,
          service: "arkscore-api",
          wavyCredentialsConfigured: true,
          subjectHashSaltConfigured: true,
          mockMode: false,
        }),
      );
      return;
    }

    if (path === "/openapi.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify(createOpenApiFixture()));
      return;
    }

    if (path?.startsWith("/api/score/")) {
      response.writeHead(200, {
        "cache-control": "no-store",
        "content-type": "application/json",
        "ratelimit-limit": "120",
      });
      response.end(
        JSON.stringify({
          address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          subjectHash: `0x${"a".repeat(64)}`,
          chainId: 43113,
          institution: "bankaool",
          source: "wavy",
          evidenceHash: `0x${"b".repeat(64)}`,
          wavy: {
            analysisId: "wavy-live-fixture",
            riskScore: 18,
            traceability: {
              provider: "Wavy Node",
              riskScoreScale: "0-100",
              transactionsAnalyzed: 42,
              patternsCount: 2,
            },
          },
          composite: {
            creditScore: 82,
            decisionLabel: "Approve Bankaool loan",
          },
        }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not found" }));
  });
  const rpcServer = await listen(async (request, response) => {
    const body = (await readJson(request)) as {
      id?: number;
      method?: string;
      params?: Array<{ data?: string } | string>;
    };
    const data =
      body.params?.[0] && typeof body.params[0] === "object"
        ? body.params[0].data
        : undefined;

    response.writeHead(200, { "content-type": "application/json" });

    if (body.method === "eth_getCode") {
      response.end(
        JSON.stringify({ jsonrpc: "2.0", id: body.id, result: "0x6000" }),
      );
      return;
    }

    if (body.method === "eth_call" && data === "0x8da5cb5b") {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeAddress("0x2222222222222222222222222222222222222222"),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x92b8c652")) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeBool(false),
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x7ba53285")) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          error: {
            code: 3,
            message: "execution reverted",
            data: "0xe5fa9471",
          },
        }),
      );
      return;
    }

    if (body.method === "eth_call" && data?.startsWith("0x73c4502c")) {
      response.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: encodeBool(true),
        }),
      );
      return;
    }

    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: body.id,
        error: { code: -32601, message: "method not mocked" },
      }),
    );
  });

  try {
    const verifierEnv: Record<string, string> = options.useFallbackAliases
      ? {
          ARKSCORE_API_URL: "",
          NEXT_PUBLIC_API_BASE_URL: apiServer.url,
          FUJI_RPC_URL: rpcServer.url,
          ARKSCORE_REGISTRY_ADDRESS: "",
          CREDIT_SCORE_REGISTRY_ADDRESS: "",
          REGISTRY_ADDRESS: "",
          NEXT_PUBLIC_CREDIT_SCORE_REGISTRY_ADDRESS: registryAddress,
          ARKSCORE_SCORER_ADDRESS: "",
          SCORER_ADDRESS: scorerAddress,
        }
      : {
          ARKSCORE_API_URL: apiServer.url,
          FUJI_RPC_URL: rpcServer.url,
          ARKSCORE_REGISTRY_ADDRESS: registryAddress,
          ARKSCORE_SCORER_ADDRESS: scorerAddress,
        };

    return await runScriptAsync(
      "scripts/verify-live.ts",
      ["--skip-web", "--strict", "--require-wavy"],
      verifierEnv,
    );
  } finally {
    await apiServer.close();
    await rpcServer.close();
  }
}

function createOpenApiFixture() {
  return {
    openapi: "3.1.0",
    info: { title: "ArkScore API" },
    paths: {
      "/health": { get: { responses: { "200": {} } } },
      "/api/score/{address}": {
        get: {
          responses: {
            "200": { headers: { "Cache-Control": {} } },
            "400": {},
            "404": {},
            "429": {},
            "500": {},
            "502": {},
            "504": {},
          },
        },
      },
    },
    components: {
      schemas: {
        HealthResponse: {
          required: [
            "wavyCredentialsConfigured",
            "subjectHashSaltConfigured",
            "mockMode",
          ],
          properties: {
            wavyCredentialsConfigured: {},
            subjectHashSaltConfigured: {},
            mockMode: {},
          },
        },
        ScoreApiResponse: {
          required: ["subjectHash"],
          properties: {
            subjectHash: { pattern: "^0x[a-fA-F0-9]{64}$" },
          },
        },
        WavyRiskResult: {
          required: ["traceability"],
          properties: {
            traceability: {},
          },
        },
        WavyTraceability: {
          required: ["riskScoreScale"],
          properties: {
            riskScoreScale: {},
            addressRegistration: {},
          },
        },
      },
    },
  };
}

function encodeAddress(address: string) {
  return `0x${address.slice(2).padStart(64, "0")}`;
}

function encodeBool(value: boolean) {
  return `0x${(value ? "1" : "0").padStart(64, "0")}`;
}

function encodeScoreRecord(input: {
  subjectHash: string;
  wavyRiskScore: number;
  compositeCreditScore: number;
  decision: number;
  evidenceHash: string;
  analysisId: string;
  institution: string;
  updatedAt: bigint;
  submitter: string;
}) {
  const analysisTail = encodeAbiString(input.analysisId);
  const institutionTail = encodeAbiString(input.institution);
  const tupleHeadSize = 9 * 32;
  const analysisOffset = tupleHeadSize;
  const institutionOffset = tupleHeadSize + analysisTail.length / 2;
  const tuple = [
    input.subjectHash.slice(2),
    encodeUint(input.wavyRiskScore),
    encodeUint(input.compositeCreditScore),
    encodeUint(input.decision),
    input.evidenceHash.slice(2),
    encodeUint(analysisOffset),
    encodeUint(institutionOffset),
    encodeUint(input.updatedAt),
    input.submitter.slice(2).padStart(64, "0"),
    analysisTail,
    institutionTail,
  ].join("");

  return `0x${encodeUint(32)}${tuple}`;
}

function encodeAbiString(value: string) {
  const valueHex = Buffer.from(value, "utf8").toString("hex");
  const paddedLength = Math.ceil(valueHex.length / 64) * 64;

  return `${encodeUint(Buffer.byteLength(value, "utf8"))}${valueHex.padEnd(paddedLength, "0")}`;
}

function encodeUint(value: number | bigint) {
  return BigInt(value).toString(16).padStart(64, "0");
}
