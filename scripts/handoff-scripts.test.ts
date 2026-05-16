import { strict as assert } from "node:assert";
import { spawn, spawnSync } from "node:child_process";
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
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
  assert.match(result.output, /ARKSCORE_SCORE_RATE_LIMIT_MAX=120/);
  assert.match(result.output, /ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS=60000/);
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

test("submission evidence renders configured public deployment targets only", () => {
  const result = runScript(
    "scripts/submission-evidence.ts",
    ["--skip-checks"],
    {
      ARKSCORE_WEB_URL: "https://arkscore-demo.vercel.app/",
      ARKSCORE_API_URL: "https://arkscore-api.up.railway.app/",
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

function encodeAddress(address: string) {
  return `0x${address.slice(2).padStart(64, "0")}`;
}

function encodeBool(value: boolean) {
  return `0x${(value ? "1" : "0").padStart(64, "0")}`;
}
