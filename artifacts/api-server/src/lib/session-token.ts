import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

function getSecret(): string {
  const secret = process.env["SESSION_SECRET"];
  if (!secret || secret.length < 16) {
    throw new Error(
      "SESSION_SECRET is required and must be at least 16 chars. Set it in your environment.",
    );
  }
  return secret;
}

function base64url(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function hmac(payload: string): string {
  return base64url(createHmac("sha256", getSecret()).update(payload).digest());
}

export function signToken(userId: number, ttlSeconds = TOKEN_TTL_SECONDS): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${userId}.${exp}`;
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export type VerifiedToken = { userId: number; exp: number };

export function verifyToken(token: string): VerifiedToken | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userIdStr, expStr, sig] = parts;
  const userId = parseInt(userIdStr, 10);
  const exp = parseInt(expStr, 10);
  if (isNaN(userId) || isNaN(exp)) return null;
  if (exp * 1000 < Date.now()) return null;

  const expected = hmac(`${userIdStr}.${expStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return { userId, exp };
}
