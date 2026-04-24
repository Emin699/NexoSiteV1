type PayPalEnv = "sandbox" | "live";

function getConfig(): { env: PayPalEnv; clientId: string; clientSecret: string; baseUrl: string } | null {
  const clientId = process.env["PAYPAL_CLIENT_ID"];
  const clientSecret = process.env["PAYPAL_CLIENT_SECRET"];
  const env = (process.env["PAYPAL_ENV"] as PayPalEnv) || "sandbox";
  if (!clientId || !clientSecret) return null;
  const baseUrl = env === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
  return { env, clientId, clientSecret, baseUrl };
}

export function isPayPalConfigured(): boolean {
  return getConfig() !== null;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const cfg = getConfig();
  if (!cfg) throw new Error("PayPal not configured");
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;

  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");
  const r = await fetch(`${cfg.baseUrl}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PayPal auth failed: ${r.status} ${text}`);
  }
  const data = (await r.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function createOrder(amountEur: number): Promise<{ id: string }> {
  const cfg = getConfig();
  if (!cfg) throw new Error("PayPal not configured");
  const token = await getAccessToken();
  const r = await fetch(`${cfg.baseUrl}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: "EUR", value: amountEur.toFixed(2) },
          description: "Recharge NexoShop",
        },
      ],
      application_context: {
        brand_name: "NexoShop",
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PayPal create order failed: ${r.status} ${text}`);
  }
  const data = (await r.json()) as { id: string };
  return { id: data.id };
}

export async function captureOrder(orderId: string): Promise<{ status: string; amountEur: number }> {
  const cfg = getConfig();
  if (!cfg) throw new Error("PayPal not configured");
  const token = await getAccessToken();
  const r = await fetch(`${cfg.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`PayPal capture failed: ${r.status} ${text}`);
  }
  const data = (await r.json()) as {
    status: string;
    purchase_units?: Array<{ payments?: { captures?: Array<{ amount?: { value?: string } }> } }>;
  };
  const captureValue =
    data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? "0";
  return { status: data.status, amountEur: Number(captureValue) };
}

export function getClientId(): string | null {
  return getConfig()?.clientId ?? null;
}
