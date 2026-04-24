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
dbUrl.searchParams.delete("sslmode");
dbUrl.searchParams.delete("channel_binding");

export const pool = new Pool({
  connectionString: dbUrl.toString(),
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool, { schema });

export * from "./schema";
