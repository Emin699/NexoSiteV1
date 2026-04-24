import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const dbUrl = new URL(process.env.DATABASE_URL);
const sslMode = dbUrl.searchParams.get("sslmode");
dbUrl.searchParams.delete("sslmode");
dbUrl.searchParams.delete("channel_binding");

const isProd = process.env.NODE_ENV === "production";
const isLocalHost = dbUrl.hostname === "localhost" || dbUrl.hostname === "helium";

// PRODUCTION: TLS is mandatory and certs MUST validate. Refuse to start if
// the connection string explicitly disables SSL — silent plaintext transport
// of credentials/customer data is unacceptable.
if (isProd && (sslMode === "disable" || isLocalHost)) {
  throw new Error(
    "Refusing to start: DATABASE_URL must use TLS in production " +
      "(sslmode=disable or local host detected).",
  );
}

const sslDisabled = !isProd && (sslMode === "disable" || isLocalHost);
const sslConfig = sslDisabled ? false : { rejectUnauthorized: isProd };

export const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: sslConfig,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
