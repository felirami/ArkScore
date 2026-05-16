import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { getAllowedOrigins } from "./config/env.js";
import { HttpError } from "./lib/http-error.js";
import { healthRouter } from "./routes/health.js";
import { scoreRouter } from "./routes/score.js";

export function createApp() {
  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.use(helmet());
  app.use(express.json({ limit: "1mb" }));
  app.use(
    cors({
      origin(origin, callback) {
        if (
          !origin ||
          allowedOrigins.includes("*") ||
          allowedOrigins.includes(origin)
        ) {
          callback(null, true);
          return;
        }

        callback(new HttpError(403, `Origin ${origin} is not allowed.`));
      }
    })
  );
  if (process.env.NODE_ENV !== "test") {
    app.use(morgan("tiny"));
  }

  app.use(healthRouter);
  app.use(scoreRouter);

  app.use((_request, _response, next) => {
    next(new HttpError(404, "Route not found."));
  });

  app.use(
    (
      error: Error,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction
    ) => {
      void _next;

      const statusCode =
        error instanceof HttpError ? error.statusCode : 500;

      response.status(statusCode).json({
        error: error.message,
        statusCode
      });
    }
  );

  return app;
}
