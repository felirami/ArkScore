import { existsSync, readFileSync } from "node:fs";

class RpcError extends Error {
  constructor(
    message: string,
    readonly data?: string,
  ) {
    super(message);
  }
}

const strict = process.argv.includes("--strict");
const env = {
  ...readEnvFile(".env"),
  ...readEnvFile("packages/contracts/.env"),
  ...readEnvFile("apps/web/.env.local"),
  ...process.env,
};
const fujiRpcUrl =
  env.FUJI_RPC_URL ??
  env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ??
  "https://api.avax-test.network/ext/bc/C/rpc";
const eerc20DemoAddress = firstConfiguredValue([
  env.ARKSCORE_EERC20_DEMO_ADDRESS,
  env.EERC20_DEMO_ADDRESS,
  env.NEXT_PUBLIC_EERC20_DEMO_ADDRESS,
]);

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

async function main() {
  console.log("# ArkScore eERC20 Demo Probe\n");

  if (!eerc20DemoAddress) {
    console.log(
      "[warn] Optional eERC20 demo address is not configured. Deploy Ava Labs EncryptedERC to Fuji, then set ARKSCORE_EERC20_DEMO_ADDRESS, EERC20_DEMO_ADDRESS, or NEXT_PUBLIC_EERC20_DEMO_ADDRESS.",
    );

    if (strict) {
      fail("Missing optional eERC20 demo address in strict mode.");
    }

    return;
  }

  if (!isAddress(eerc20DemoAddress)) {
    fail("Configured eERC20 demo address is not a valid EVM address.");
  }

  const chainId = Number(BigInt(await rpc<string>("eth_chainId", [])));

  if (chainId !== 43113) {
    fail(`Expected Avalanche Fuji chain id 43113, received ${chainId}.`);
  }

  console.log("[pass] Connected to Avalanche Fuji");

  const code = await rpc<string>("eth_getCode", [eerc20DemoAddress, "latest"]);

  if (!code || code === "0x") {
    fail(`${eerc20DemoAddress} has no deployed bytecode on Fuji.`);
  }

  console.log(
    `[pass] Optional eERC20 demo contract has deployed bytecode at ${eerc20DemoAddress}`,
  );
  console.log(
    `[info] Publish it to the dashboard as NEXT_PUBLIC_EERC20_DEMO_ADDRESS=${eerc20DemoAddress}`,
  );
  console.log(
    `[info] Include it in final verification with ARKSCORE_EERC20_DEMO_ADDRESS=${eerc20DemoAddress} pnpm verify:live`,
  );
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

function fail(message: string): never {
  throw new Error(message);
}

function firstConfiguredValue(values: Array<string | undefined>) {
  return values.find((value) => hasUsableValue(value))?.trim();
}

function hasUsableValue(value: string | undefined) {
  if (!value?.trim()) return false;
  const normalized = value.trim().toLowerCase();

  return (
    !normalized.includes("replace_with") &&
    normalized !== "0x..." &&
    normalized !== "tbd"
  );
}

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
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
