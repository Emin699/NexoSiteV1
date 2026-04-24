import express, { type Express, type ErrorRequestHandler, type Request } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";
import { userAuthMiddleware } from "./middlewares/userAuth";

const app: Express = express();

// Trust proxy (Caddy reverse proxy in production sets X-Forwarded-For).
app.set("trust proxy", 1);

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

// Security headers — keep CSP off here, the static frontend is served separately.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
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
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use(userAuthMiddleware);

// Rate limit — applied to write/auth-sensitive endpoints. IPv6 safe.
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    if (req.userId) return `u:${req.userId}`;
    return ipKeyGenerator(req.ip ?? "unknown");
  },
  message: { error: "Trop de requêtes — réessaye dans une minute." },
});

const veryStrictLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: (req: Request): string => {
    if (req.userId) return `u:${req.userId}`;
    return ipKeyGenerator(req.ip ?? "unknown");
  },
  message: { error: "Trop de tentatives — réessaye dans une minute." },
});

app.use("/api/auth/login", veryStrictLimiter);
app.use("/api/auth/register", veryStrictLimiter);
app.use("/api/auth/verify-email", veryStrictLimiter);
app.use("/api/auth/resend-code", veryStrictLimiter);
app.use("/api/wallet/recharge", sensitiveLimiter);
app.use("/api/orders/buy", sensitiveLimiter);
app.use("/api/cart/checkout", sensitiveLimiter);

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
