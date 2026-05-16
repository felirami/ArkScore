import { Router } from "express";
import { hasWavyCredentials, shouldUseMockScores } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "arkscore-api",
    wavyCredentialsConfigured: hasWavyCredentials(),
    mockMode: shouldUseMockScores()
  });
});
