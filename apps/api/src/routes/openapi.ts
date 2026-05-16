import { Router } from "express";
import { createOpenApiDocument } from "../openapi.js";

export const openApiRouter = Router();

openApiRouter.get("/", (request, response) => {
  response.json({
    service: "arkscore-api",
    docs: "/openapi.json",
    health: "/health",
    score: "/api/score/{address}",
    origin: requestOrigin(request),
  });
});

openApiRouter.get("/openapi.json", (request, response) => {
  response.json(createOpenApiDocument(requestOrigin(request)));
});

function requestOrigin(request: {
  get(name: string): string | undefined;
  protocol: string;
}) {
  const protocol =
    firstHeaderValue(request.get("x-forwarded-proto")) ?? request.protocol;
  const host =
    firstHeaderValue(request.get("x-forwarded-host")) ?? request.get("host");

  return host ? `${protocol}://${host}` : undefined;
}

function firstHeaderValue(value: string | undefined) {
  return value?.split(",")[0]?.trim() || undefined;
}
