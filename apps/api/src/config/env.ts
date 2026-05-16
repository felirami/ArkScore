import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ quiet: true });

const demoSubjectHashSalt = "arkscore-demo-subject-hash-salt";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
  WAVY_NODE_API_KEY: z.string().optional(),
  WAVY_NODE_PROJECT_ID: z.string().optional(),
  WAVY_NODE_BASE_URL: z.string().url().default("https://api.wavynode.com/v1"),
  WAVY_NODE_CHAIN_ID: z.coerce.number().int().positive().default(43113),
  WAVY_NODE_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  WAVY_NODE_AUTO_REGISTER: z.enum(["true", "false"]).default("true"),
  WAVY_NODE_FOREIGN_USER_PREFIX: z.string().default("arkscore-wallet"),
  WAVY_NODE_MOCK_MODE: z.enum(["auto", "true", "false"]).default("auto"),
  ARKSCORE_SCORE_RATE_LIMIT_MAX: z.coerce.number().int().min(0).default(120),
  ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),
  ARKSCORE_SUBJECT_HASH_SALT: z.string().default(demoSubjectHashSalt),
});

export const env = envSchema.parse(process.env);

export function getAllowedOrigins(): string[] {
  return env.ALLOWED_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function hasWavyCredentials(): boolean {
  return Boolean(
    env.WAVY_NODE_API_KEY &&
    env.WAVY_NODE_PROJECT_ID &&
    !env.WAVY_NODE_API_KEY.includes("replace_with") &&
    !env.WAVY_NODE_PROJECT_ID.includes("replace_with"),
  );
}

export function hasProductionSubjectHashSalt(): boolean {
  const salt = env.ARKSCORE_SUBJECT_HASH_SALT.trim();

  return Boolean(
    salt &&
    salt !== demoSubjectHashSalt &&
    !salt.includes("replace_with") &&
    !salt.includes("your-") &&
    salt.length >= 32,
  );
}

export function shouldUseMockScores(): boolean {
  if (env.WAVY_NODE_MOCK_MODE === "true") return true;
  if (env.WAVY_NODE_MOCK_MODE === "false") return false;
  return !hasWavyCredentials();
}

export function shouldAutoRegisterWavyAddresses(): boolean {
  return env.WAVY_NODE_AUTO_REGISTER === "true";
}
