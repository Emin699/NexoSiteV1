import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/userAuth.js";
import { getMaintenanceFlags, setSetting } from "../lib/app-settings.js";

const router: IRouter = Router();

// Public — used by wallet UI to show maintenance badges
router.get("/maintenance", async (_req, res): Promise<void> => {
  const flags = await getMaintenanceFlags();
  res.json(flags);
});

// Admin — read
router.get("/admin/maintenance", requireAuth, requireAdmin, async (_req, res): Promise<void> => {
  const flags = await getMaintenanceFlags();
  res.json(flags);
});

const UpdateBody = z.object({
  paypalEnabled: z.boolean().optional(),
  sumupEnabled: z.boolean().optional(),
  ltcEnabled: z.boolean().optional(),
});

// Admin — update
router.put("/admin/maintenance", requireAuth, requireAdmin, async (req, res): Promise<void> => {
  const parsed = UpdateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Payload invalide" });
    return;
  }

  const updates: Array<Promise<void>> = [];
  if (parsed.data.paypalEnabled !== undefined) {
    updates.push(setSetting("paypal_enabled", parsed.data.paypalEnabled ? "true" : "false"));
  }
  if (parsed.data.sumupEnabled !== undefined) {
    updates.push(setSetting("sumup_enabled", parsed.data.sumupEnabled ? "true" : "false"));
  }
  if (parsed.data.ltcEnabled !== undefined) {
    updates.push(setSetting("ltc_enabled", parsed.data.ltcEnabled ? "true" : "false"));
  }
  await Promise.all(updates);

  const flags = await getMaintenanceFlags();
  res.json(flags);
});

export default router;
