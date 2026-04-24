import { Router, type IRouter } from "express";
import bcrypt from "bcrypt";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { sendVerificationEmail } from "../lib/resend-client.js";
import { isDisposableEmail } from "../lib/disposable-emails.js";
import { signToken } from "../lib/session-token.js";

const router: IRouter = Router();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(50),
});

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

  const { email, password, firstName } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();

  if (isDisposableEmail(normalizedEmail)) {
    res.status(400).json({ error: "Les adresses email jetables ne sont pas autorisées. Utilise une adresse personnelle." });
    return;
  }

  const [existing] = await db
    .select({ id: usersTable.id, emailVerified: usersTable.emailVerified })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail));

  if (existing && existing.emailVerified === 1) {
    res.status(409).json({ error: "Cette adresse email est déjà utilisée." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const code = generateCode();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  let userId: number;
  let returnedFirstName: string;

  if (existing) {
    // Existing unverified account — overwrite credentials and resend code
    const [updated] = await db
      .update(usersTable)
      .set({
        passwordHash,
        firstName,
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt,
      })
      .where(eq(usersTable.id, existing.id))
      .returning({ id: usersTable.id, firstName: usersTable.firstName });
    userId = updated.id;
    returnedFirstName = updated.firstName;
  } else {
    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        firstName,
        username: null,
        emailVerified: 0,
        verificationCode: code,
        verificationCodeExpiresAt: expiresAt,
      })
      .returning({ id: usersTable.id, firstName: usersTable.firstName });
    userId = user.id;
    returnedFirstName = user.firstName;
  }

  try {
    await sendVerificationEmail(normalizedEmail, returnedFirstName, code);
  } catch (err) {
    req.log.error({ err }, "Failed to send verification email");
    res.status(500).json({ error: "Impossible d'envoyer l'email de vérification. Vérifie ton adresse et réessaye." });
    return;
  }

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
    res.status(400).json({ error: "Code incorrect." });
    return;
  }
  if (!user.verificationCodeExpiresAt || user.verificationCodeExpiresAt.getTime() < Date.now()) {
    res.status(400).json({ error: "Code expiré. Demande un nouveau code." });
    return;
  }

  await db
    .update(usersTable)
    .set({ emailVerified: 1, verificationCode: null, verificationCodeExpiresAt: null })
    .where(eq(usersTable.id, user.id));

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

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Email ou mot de passe incorrect." });
    return;
  }

  if (user.emailVerified !== 1) {
    res.status(403).json({
      error: "Email non vérifié. Saisis le code reçu par email.",
      userId: user.id,
      needsVerification: true,
      firstName: user.firstName,
      email: user.email ?? "",
    });
    return;
  }

  res.json({
    userId: user.id,
    firstName: user.firstName,
    email: user.email,
    needsVerification: false,
    token: signToken(user.id),
  });
});

export default router;
