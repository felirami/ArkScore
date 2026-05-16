import { Router } from "express";
import { openApiDocument } from "../openapi.js";

export const openApiRouter = Router();

openApiRouter.get("/", (_request, response) => {
  response.json({
    service: "arkscore-api",
    docs: "/openapi.json",
    health: "/health",
    score: "/api/score/{address}"
  });
});

openApiRouter.get("/openapi.json", (_request, response) => {
  response.json(openApiDocument);
});
