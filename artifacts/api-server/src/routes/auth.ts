import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { sendVerificationEmail } from "../lib/resend-client.js";
import { isDisposableEmail } from "../lib/disposable-emails.js";
import { signToken } from "../lib/session-token.js";
import { notify } from "../lib/notifier.js";

const router: IRouter = Router();

// Pre-computed bcrypt hash of a long random string. Used to keep login latency constant
// when the email doesn't exist (mitigates timing-based account enumeration).
// Hash of: "nexoshop_dummy_pwd_for_constant_time_compare_v1" (cost 10)
const DUMMY_BCRYPT_HASH =
  "$2b$10$abcdefghijklmnopqrstuuYf3w0SoXJZH7nFsFq3O6NCuQbZS9H/2";

// Per-user verification attempt tracker (in-memory). Caps brute-force on the 6-digit code
// even from rotating IPs. After MAX_VERIFY_ATTEMPTS the code is invalidated server-side.
const MAX_VERIFY_ATTEMPTS = 5;
const VERIFY_LOCKOUT_MS = 15 * 60 * 1000;
const verifyAttempts = new Map<number, { count: number; firstAt: number }>();
function bumpVerifyAttempts(userId: number): number {
  const now = Date.now();
  const entry = verifyAttempts.get(userId);
  if (!entry || now - entry.firstAt > VERIFY_LOCKOUT_MS) {
    verifyAttempts.set(userId, { count: 1, firstAt: now });
    return 1;
  }
  entry.count += 1;
  return entry.count;
}
function resetVerifyAttempts(userId: number): void {
  verifyAttempts.delete(userId);
}
// Periodic GC: prevents unbounded growth from one-shot attempts that never succeed
// (the entry would otherwise live forever).
setInterval(() => {
  const cutoff = Date.now() - VERIFY_LOCKOUT_MS;
  for (const [uid, entry] of verifyAttempts) {
    if (entry.firstAt < cutoff) verifyAttempts.delete(uid);
  }
}, 5 * 60 * 1000).unref();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(50),
  referralCode: z.string().trim().optional().nullable(),
});

async function resolveReferrerId(
  rawCode: string | null | undefined,
  newUserEmail: string,
): Promise<number | null> {
  if (!rawCode) return null;
  const trimmed = rawCode.trim();
  if (!trimmed) return null;
  const id = Number(trimmed);
  if (!Number.isInteger(id) || id <= 0) return null;
  const [referrer] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.id, id));
  if (!referrer) return null;
  // Refuse self-referral via the same email account
  if (referrer.email && referrer.email.toLowerCase() === newUserEmail.toLowerCase()) {
    return null;
  }
  return referrer.id;
}

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const VerifySchema = z.object({
  userId: z.number().int(),
  code: z.string().length(6),
});

const ResendSchema = z.object({
  userId: z.number().int(),
});

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides. Email valide, mot de passe (6 caractères min) et prénom requis." });
    return;
  }

  const { email, password, firstName, referralCode } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (isDisposableEmail(normalizedEmail)) {
    res.status(400).json({ error: "Les adresses email jetables ne sont pas autorisées. Utilise une adresse personnelle." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, emailVerified: usersTable.emailVerified, referredBy: usersTable.referredBy })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing && existing.emailVerified === 1) {
    res.status(409).json({ error: "Cette adresse email est déjà utilisée." });
    return;
  }

  const referrerId = await resolveReferrerId(referralCode, normalizedEmail);

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  let userId: number;
  let returnedFirstName: string;

  if (existing) {
    // Existing unverified account — overwrite credentials and resend code.
    // Only set referredBy if it isn't already linked to a referrer.
    const updateValues: {
      passwordHash: string;
      firstName: string;
      verificationCode: string;
      verificationCodeExpiresAt: Date;
      referredBy?: number;
    } = {
      passwordHash,
      firstName,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
    };
    if (existing.referredBy == null && referrerId != null && referrerId !== existing.id) {
      updateValues.referredBy = referrerId;
    }
    const [updated] = await db
      .update(usersTable)
      .set(updateValues)
      .where(eq(usersTable.id, existing.id))
      .returning({ id: usersTable.id, firstName: usersTable.firstName, referredBy: usersTable.referredBy });
    userId = updated.id;
    returnedFirstName = updated.firstName;

    // Insert the referral row if needed (only when this register call set the referrer).
    if (updateValues.referredBy != null) {
      const [alreadyLinked] = await db
        .select({ id: referralsTable.id })
        .from(referralsTable)
        .where(eq(referralsTable.referredId, updated.id));
      if (!alreadyLinked) {
        await db.insert(referralsTable).values({
          referrerId: updateValues.referredBy,
          referredId: updated.id,
          eligible: false,
          paid: false,
        });
      }
    }
  } else {
    const insertValues: {
      email: string;
      passwordHash: string;
      firstName: string;
      username: null;
      emailVerified: number;
      verificationCode: string;
      verificationCodeExpiresAt: Date;
      referredBy?: number;
    } = {
      email: normalizedEmail,
      passwordHash,
      firstName,
      username: null,
      emailVerified: 0,
      verificationCode: code,
      verificationCodeExpiresAt: expiresAt,
    };
    if (referrerId != null) {
      insertValues.referredBy = referrerId;
    }
    const [user] = await db
      .insert(usersTable)
      .values(insertValues)
      .returning({ id: usersTable.id, firstName: usersTable.firstName });
    userId = user.id;
    returnedFirstName = user.firstName;

    if (referrerId != null && referrerId !== user.id) {
      await db.insert(referralsTable).values({
        referrerId,
        referredId: user.id,
        eligible: false,
        paid: false,
      });
    }
  }

  try {
    await sendVerificationEmail(normalizedEmail, returnedFirstName, code);
  } catch (err) {
    req.log.error({ err }, "Failed to send verification email");
    res.status(500).json({ error: "Impossible d'envoyer l'email de vérification. Vérifie ton adresse et réessaye." });
    return;
  }

  notify.userRegistered({
    id: userId,
    email: normalizedEmail,
    firstName: returnedFirstName,
  });

  res.json({
    userId,
    firstName: returnedFirstName,
    email: normalizedEmail,
    needsVerification: true,
    token: null,
  });
});

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const parsed = VerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Code invalide. Saisis les 6 chiffres reçus par email." });
    return;
  }

  const { userId, code } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user) {
    res.status(400).json({ error: "Compte introuvable." });
    return;
  }
  if (user.emailVerified === 1) {
    resetVerifyAttempts(user.id);
    res.json({
      userId: user.id,
      firstName: user.firstName,
      email: user.email ?? "",
      needsVerification: false,
      token: signToken(user.id),
    });
    return;
  }
  if (!user.verificationCode || user.verificationCode !== code) {
    const attempts = bumpVerifyAttempts(user.id);
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      // Invalidate the code server-side so brute-force becomes impossible.
      await db
        .update(usersTable)
        .set({ verificationCode: null, verificationCodeExpiresAt: null })
        .where(eq(usersTable.id, user.id));
      res.status(429).json({
        error: "Trop d'essais. Demande un nouveau code par email.",
      });
      return;
    }
    res.status(400).json({ error: "Code incorrect." });
    return;
  }
  if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "Code expiré. Demande un nouveau code." });
    return;
  }

  resetVerifyAttempts(user.id);
  await db
    .update(usersTable)
    .set({ emailVerified: 1, verificationCode: null, verificationCodeExpiresAt: null })
    .where(eq(usersTable.id, user.id));

  notify.userVerified({
    id: user.id,
    email: user.email ?? "",
    firstName: user.firstName,
    username: user.username,
  });

  res.json({
    userId: user.id,
    firstName: user.firstName,
    email: user.email ?? "",
    needsVerification: false,
    token: signToken(user.id),
  });
});

router.post("/auth/resend-code", async (req, res): Promise<void> => {
  const parsed = ResendSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Requête invalide." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId));
  if (!user || !user.email) {
    res.status(400).json({ error: "Compte introuvable." });
    return;
  }
  if (user.emailVerified === 1) {
    res.json({ ok: true });
    return;
  }
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await db
    .update(usersTable)
    .set({ verificationCode: code, verificationCodeExpiresAt: expiresAt })
    .where(eq(usersTable.id, user.id));

  // Fresh code → fresh attempts budget. Without this reset, an existing lockout would
  // immediately invalidate the new code on the first wrong guess.
  resetVerifyAttempts(user.id);

  try {
    await sendVerificationEmail(user.email, user.firstName, code);
  } catch (err) {
    req.log.error({ err }, "Failed to resend verification email");
    res.status(500).json({ error: "Impossible d'envoyer l'email." });
    return;
  }
  res.json({ ok: true });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Email et mot de passe requis." });
    return;
  }

  const { email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  // Timing-attack mitigation: always run bcrypt.compare, even if the user
  // doesn't exist, so login latency is constant and can't reveal account existence.
  const hashToCheck = user?.passwordHash ?? DUMMY_BCRYPT_HASH;
  const valid = await bcrypt.compare(password, hashToCheck);

  if (!user || !user.passwordHash || !valid) {
    notify.loginFailure(
      normalizedEmail,
      !user || !user.passwordHash ? "compte introuvable" : "mot de passe incorrect",
    );
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  if (user.emailVerified !== 1) {
    // Don't leak firstName/email — the client already knows the email it just submitted.
    // Only return the userId required by the verification screen.
    res.status(403).json({
      error: "Email non vérifié. Saisis le code reçu par email.",
      userId: user.id,
      needsVerification: true,
    });
    return;
  }

  notify.loginSuccess({
    id: user.id,
    email: user.email ?? "",
    firstName: user.firstName,
    username: user.username,
  });

  res.json({
    userId: user.id,
    firstName: user.firstName,
    email: user.email,
    needsVerification: false,
    token: signToken(user.id),
  });
});

export default router;
