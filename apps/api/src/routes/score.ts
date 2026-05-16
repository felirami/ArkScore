import { ZodError } from "zod";
import { type Request, type RequestHandler, Router } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { scoreWallet } from "../services/score.js";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export function createScoreRouter() {
  const router = Router();
  const rateLimitScore = createScoreRateLimitMiddleware();

  router.get(
    "/api/score/:address",
    applyScorePrivacyHeaders,
    rateLimitScore,
    async (request, response, next) => {
      try {
        const institution =
          typeof request.query.institution === "string"
            ? request.query.institution
            : undefined;
        const address =
          typeof request.params.address === "string"
            ? request.params.address
            : "";
        const scoreInput = institution ? { address, institution } : { address };
        const result = await scoreWallet({
          ...scoreInput,
        });

        response.json(result);
      } catch (error) {
        if (error instanceof ZodError) {
          response.status(400).json({
            error: "Invalid score request.",
            details: error.issues.map((issue) => issue.message),
          });
          return;
        }

        next(error);
      }
    },
  );

  return router;
}

function createScoreRateLimitMiddleware(): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  const maxRequests = env.ARKSCORE_SCORE_RATE_LIMIT_MAX;
  const windowMs = env.ARKSCORE_SCORE_RATE_LIMIT_WINDOW_MS;
  let nextCleanupAt = Date.now() + windowMs;

  return (request, response, next) => {
    if (maxRequests === 0) {
      next();
      return;
    }

    const now = Date.now();
    if (now >= nextCleanupAt) {
      pruneExpiredBuckets(buckets, now);
      nextCleanupAt = now + windowMs;
    }

    const key = scoreRateLimitKey(request);
    const current = buckets.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, maxRequests - bucket.count);
    response.setHeader("RateLimit-Limit", String(maxRequests));
    response.setHeader("RateLimit-Remaining", String(remaining));
    response.setHeader(
      "RateLimit-Reset",
      String(Math.ceil(bucket.resetAt / 1000)),
    );

    if (bucket.count > maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      response.setHeader("Retry-After", String(retryAfter));
      next(new HttpError(429, "Too many score requests. Try again shortly."));
      return;
    }

    next();
  };
}

function pruneExpiredBuckets(
  buckets: Map<string, RateLimitBucket>,
  now: number,
) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function scoreRateLimitKey(request: Request) {
  if (request.ip) {
    return request.ip;
  }

  if (
    request.headers &&
    typeof request.headers === "object" &&
    "x-forwarded-for" in request.headers
  ) {
    const forwardedFor = (request.headers as Record<string, unknown>)[
      "x-forwarded-for"
    ];

    if (typeof forwardedFor === "string" && forwardedFor.trim()) {
      return forwardedFor.split(",")[0]?.trim() ?? "unknown";
    }
  }

  return request.ip ?? "unknown";
}

const applyScorePrivacyHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
  next();
};
