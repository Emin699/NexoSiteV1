import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

function usage(): never {
  console.error(`
Gestion des administrateurs NexoShop

Usage:
  pnpm --filter @workspace/api-server run admin <command> [args]

Commandes:
  list                    Lister tous les admins
  add <email>             Promouvoir l'utilisateur en admin
  remove <email>          Retirer les droits admin
  status <email>          Voir le statut d'un utilisateur

Exemples:
  pnpm --filter @workspace/api-server run admin add patron@nexoshop69.com
  pnpm --filter @workspace/api-server run admin remove ancien@exemple.com
  pnpm --filter @workspace/api-server run admin list
`);
  process.exit(1);
}

function normalizeEmail(raw: string | undefined): string {
  if (!raw) {
    console.error("Erreur: email manquant.");
    process.exit(1);
  }
  return raw.toLowerCase().trim();
}

async function listAdmins(): Promise<void> {
  const admins = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.isAdmin, 1))
    .orderBy(usersTable.id);

  if (admins.length === 0) {
    console.log("Aucun administrateur enregistré.");
    return;
  }
  console.log(`${admins.length} administrateur(s):`);
  for (const a of admins) {
    console.log(`  #${a.id}  ${a.email ?? "(sans email)"}  ${a.firstName}  (créé ${a.createdAt.toISOString()})`);
  }
}

async function setAdmin(email: string, value: 0 | 1): Promise<void> {
  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email, isAdmin: usersTable.isAdmin, firstName: usersTable.firstName })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`);

  if (!user) {
    console.error(`Erreur: aucun utilisateur trouvé avec l'email "${email}".`);
    console.error("Astuce: l'utilisateur doit d'abord créer son compte via /register.");
    process.exit(1);
  }

  if (user.isAdmin === value) {
    console.log(
      value === 1
        ? `${user.email} est déjà administrateur.`
        : `${user.email} n'était pas administrateur.`
    );
    return;
  }

  await db.update(usersTable).set({ isAdmin: value }).where(eq(usersTable.id, user.id));

  console.log(
    value === 1
      ? `OK: ${user.email} (#${user.id}, ${user.firstName}) est maintenant administrateur.`
      : `OK: ${user.email} (#${user.id}) n'est plus administrateur.`
  );
}

async function statusAdmin(email: string): Promise<void> {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      isAdmin: usersTable.isAdmin,
      emailVerified: usersTable.emailVerified,
    })
    .from(usersTable)
    .where(sql`lower(${usersTable.email}) = ${email}`);

  if (!user) {
    console.log(`Aucun utilisateur trouvé avec l'email "${email}".`);
    return;
  }

  console.log(`Utilisateur #${user.id}`);
  console.log(`  Email      : ${user.email}`);
  console.log(`  Prénom     : ${user.firstName}`);
  console.log(`  Vérifié    : ${user.emailVerified === 1 ? "oui" : "non"}`);
  console.log(`  Admin      : ${user.isAdmin === 1 ? "OUI" : "non"}`);
}

async function main(): Promise<void> {
  const [, , cmd, arg] = process.argv;
  switch (cmd) {
    case "list":
      await listAdmins();
      break;
    case "add":
      await setAdmin(normalizeEmail(arg), 1);
      break;
    case "remove":
      await setAdmin(normalizeEmail(arg), 0);
      break;
    case "status":
      await statusAdmin(normalizeEmail(arg));
      break;
    default:
      usage();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Erreur:", err?.message ?? err);
    if (err?.cause) console.error("Cause:", err.cause);
    process.exit(1);
  });
