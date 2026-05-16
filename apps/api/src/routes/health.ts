import { Router } from "express";
import {
  hasProductionSubjectHashSalt,
  hasWavyCredentials,
  shouldUseMockScores,
} from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.json({
    ok: true,
    service: "arkscore-api",
    wavyCredentialsConfigured: hasWavyCredentials(),
    subjectHashSaltConfigured: hasProductionSubjectHashSalt(),
    mockMode: shouldUseMockScores(),
  });
});
