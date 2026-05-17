import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { avalancheFujiChainId, parseEnv, wavyAvalancheChainId } from "./env.js";

test("API config defaults Wavy Node scoring to Avalanche mainnet", () => {
  const parsed = parseEnv({});

  assert.equal(parsed.WAVY_NODE_CHAIN_ID, wavyAvalancheChainId);
});

test("API config keeps Wavy scoring chain separate from Fuji registry", () => {
  const parsed = parseEnv({ WAVY_NODE_CHAIN_ID: "43114" });

  assert.equal(parsed.WAVY_NODE_CHAIN_ID, wavyAvalancheChainId);
  assert.equal(avalancheFujiChainId, 43113);
});

test("API config refuses unsupported Wavy Node chain IDs", () => {
  assert.throws(
    () => parseEnv({ WAVY_NODE_CHAIN_ID: "1" }),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.match(
        error.message,
        /WAVY_NODE_CHAIN_ID must be Wavy-supported Avalanche chain id 43114/,
      );
      return true;
    },
  );
});
