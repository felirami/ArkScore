import {
  scoreApiResponseSchema,
  type Institution,
  type ScoreApiResponse,
} from "@arkscore/shared";
import { createDemoScore } from "@/lib/demo-score";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";
const demoFallbackSetting = process.env.NEXT_PUBLIC_ENABLE_DEMO_FALLBACK;
const explicitDemoFallback = demoFallbackSetting === "true";
const disabledDemoFallback = demoFallbackSetting === "false";
const hasConfiguredApiBaseUrl = Boolean(process.env.NEXT_PUBLIC_API_BASE_URL);

export async function fetchWalletScore(input: {
  address: string;
  institution: Institution;
}): Promise<ScoreApiResponse> {
  if (shouldUseHostedDemoFallback()) {
    return createDemoScore(input);
  }

  const url = new URL(`/api/score/${input.address}`, apiBaseUrl);
  url.searchParams.set("institution", input.institution);

  try {
    const response = await fetch(url);
    const payload = (await response.json().catch(() => null)) as
      | ScoreApiResponse
      | { error?: string }
      | null;

    if (!response.ok) {
      throw new Error(
        payload && "error" in payload && payload.error
          ? payload.error
          : "Unable to score wallet.",
      );
    }

    const parsed = scoreApiResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new Error("Score API returned an invalid response.");
    }

    return parsed.data;
  } catch (error) {
    if (explicitDemoFallback) {
      return createDemoScore(input);
    }

    throw error instanceof Error ? error : new Error("Unable to score wallet.");
  }
}

function shouldUseHostedDemoFallback() {
  if (disabledDemoFallback) return false;
  if (explicitDemoFallback) return true;
  if (hasConfiguredApiBaseUrl || typeof window === "undefined") return false;

  return !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}
