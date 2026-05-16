import { ZodError } from "zod";
import { Router } from "express";
import { scoreWallet } from "../services/score.js";

export const scoreRouter = Router();

scoreRouter.get("/api/score/:address", async (request, response, next) => {
  applyScorePrivacyHeaders(response);

  try {
    const institution =
      typeof request.query.institution === "string"
        ? request.query.institution
        : undefined;
    const scoreInput = institution
      ? { address: request.params.address ?? "", institution }
      : { address: request.params.address ?? "" };
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
});

function applyScorePrivacyHeaders(response: {
  setHeader: (name: string, value: string) => void;
}) {
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
}
