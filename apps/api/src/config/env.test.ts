import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { avalancheFujiChainId, parseEnv } from "./env.js";

test("API config defaults Wavy Node scoring to Avalanche Fuji", () => {
  const parsed = parseEnv({});

  assert.equal(parsed.WAVY_NODE_CHAIN_ID, avalancheFujiChainId);
});

test("API config refuses non-Fuji Wavy Node chain IDs", () => {
  assert.throws(
    () => parseEnv({ WAVY_NODE_CHAIN_ID: "1" }),
    (error: unknown) => {
      assert.ok(error instanceof ZodError);
      assert.match(
        error.message,
        /WAVY_NODE_CHAIN_ID must be Avalanche Fuji chain id 43113/,
      );
      return true;
    },
  );
});
