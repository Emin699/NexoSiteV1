import { db, appSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const cache = new Map<string, { value: string; expiresAt: number }>();
const TTL_MS = 15_000;

export async function getSetting(key: string, defaultValue: string): Promise<string> {
  const cached = cache.get(key);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const [row] = await db.select().from(appSettingsTable).where(eq(appSettingsTable.key, key));
  const value = row?.value ?? defaultValue;
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
  return value;
}

export async function getBoolSetting(key: string, defaultValue: boolean): Promise<boolean> {
  const v = await getSetting(key, defaultValue ? "true" : "false");
  return v === "true";
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(appSettingsTable)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettingsTable.key,
      set: { value, updatedAt: new Date() },
    });
  cache.delete(key);
}

export async function getMaintenanceFlags(): Promise<{
  paypalEnabled: boolean;
  sumupEnabled: boolean;
  ltcEnabled: boolean;
}> {
  const [paypalEnabled, sumupEnabled, ltcEnabled] = await Promise.all([
    getBoolSetting("paypal_enabled", false),
    getBoolSetting("sumup_enabled", true),
    getBoolSetting("ltc_enabled", true),
  ]);
  return { paypalEnabled, sumupEnabled, ltcEnabled };
}
