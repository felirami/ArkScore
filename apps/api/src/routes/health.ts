import { Router } from "express";
import {
  avalancheFujiChainId,
  env,
  hasProductionSubjectHashSalt,
  hasWavyCredentials,
  hasWavyIntegrationConfigured,
  shouldUseMockScores,
} from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "arkscore-api",
    wavyCredentialsConfigured: hasWavyCredentials(),
    wavyIntegrationConfigured: hasWavyIntegrationConfigured(),
    wavyChainId: env.WAVY_NODE_CHAIN_ID,
    registryChainId: avalancheFujiChainId,
    subjectHashSaltConfigured: hasProductionSubjectHashSalt(),
    mockMode: shouldUseMockScores(),
  });
});
