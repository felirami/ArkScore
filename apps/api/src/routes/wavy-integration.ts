import { type RequestHandler, Router } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.js";
import {
  getWavyIntegrationUserData,
  requireArkScoreForeignUserId,
  verifyWavyIntegrationRequest,
  wavyWebhookPayloadSchema,
} from "../services/wavy-integration.js";

export function createWavyIntegrationRouter() {
  const router = Router();

  router.get(
    "/users/:foreignUserId",
    verifySignedWavyRequest,
    (request, response, next) => {
      try {
        const foreignUserId = getRouteParam(request.params.foreignUserId);
        requireArkScoreForeignUserId(foreignUserId);

        response.json(getWavyIntegrationUserData(foreignUserId));
      } catch (error) {
        next(error);
      }
    },
  );

  router.post(
    "/webhook",
    verifySignedWavyRequest,
    (request, response, next) => {
      try {
        const payload = wavyWebhookPayloadSchema.parse(request.body);

        logWavyWebhook(payload);
        response.json({ received: true, type: payload.type });
      } catch (error) {
        if (error instanceof ZodError) {
          next(new HttpError(400, "Invalid Wavy Node webhook payload."));
          return;
        }

        next(error);
      }
    },
  );

  return router;
}

const verifySignedWavyRequest: RequestHandler = (request, _response, next) => {
  try {
    verifyWavyIntegrationRequest(request);
    next();
  } catch (error) {
    next(error);
  }
};

function logWavyWebhook(payload: { type: string; data: unknown }) {
  if (process.env.NODE_ENV === "test") return;

  if (payload.type === "error") {
    console.warn("[wavy-node] integration error notification received");
    return;
  }

  const data = isRecord(payload.data) ? payload.data : {};
  const txHash = typeof data.txHash === "string" ? data.txHash : "unknown";
  const chainId =
    typeof data.chainId === "string" || typeof data.chainId === "number"
      ? String(data.chainId)
      : "unknown";

  console.info(
    `[wavy-node] integration notification received txHash=${txHash} chainId=${chainId}`,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}
