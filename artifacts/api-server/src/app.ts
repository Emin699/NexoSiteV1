import express, { type Express, type ErrorRequestHandler } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { userAuthMiddleware } from "./middlewares/userAuth";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const corsAllowed = (process.env["CORS_ORIGINS"] || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow no-origin (curl, mobile, same-origin) and dev: open
      if (!origin || process.env["NODE_ENV"] !== "production") return cb(null, true);
      // In prod, only allow whitelisted origins
      if (corsAllowed.length === 0 || corsAllowed.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(userAuthMiddleware);

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const cause = (err as { cause?: unknown }).cause;
  const causeMessage =
    cause instanceof Error ? cause.message : cause ? String(cause) : undefined;
  const causeCode =
    cause && typeof cause === "object" && "code" in cause
      ? (cause as { code: unknown }).code
      : undefined;
  req.log.error(
    {
      err: {
        message: err?.message,
        name: err?.name,
        stack: err?.stack,
        cause: cause instanceof Error ? { message: cause.message, name: cause.name, stack: cause.stack, code: causeCode } : cause,
      },
      causeMessage,
      causeCode,
      url: req.url,
      method: req.method,
    },
    "Unhandled request error",
  );
  if (res.headersSent) return;
  res.status(500).json({
    error: "Internal Server Error",
    message: err?.message,
    cause: causeMessage,
    code: causeCode,
  });
};
app.use(errorHandler);

export default app;
