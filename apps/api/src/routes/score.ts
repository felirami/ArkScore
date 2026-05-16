import { ZodError } from "zod";
import { Router } from "express";
import { scoreWallet } from "../services/score.js";

export const scoreRouter = Router();

scoreRouter.get("/api/score/:address", async (request, response, next) => {
  try {
    const institution =
      typeof request.query.institution === "string"
        ? request.query.institution
        : undefined;
    const scoreInput = institution
      ? { address: request.params.address ?? "", institution }
      : { address: request.params.address ?? "" };
    const result = await scoreWallet({
      ...scoreInput
    });

    response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Invalid score request.",
        details: error.issues.map((issue) => issue.message)
      });
      return;
    }

    next(error);
  }
});
