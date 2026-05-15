
const SUMUP_API_BASE = "https://api.sumup.com";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env["SUMUP_CLIENT_ID"];
  const clientSecret = process.env["SUMUP_CLIENT_SECRET"];
  const apiKey = process.env["SUMUP_API_KEY"];

  if (!clientId || !clientSecret || !apiKey) {
    throw new Error("SumUp credentials manquantes (SUMUP_CLIENT_ID, SUMUP_CLIENT_SECRET, SUMUP_API_KEY)");
  }

  if (tokenCache && Date.now() < tokenCache.expiresAt - 60000) {
    return tokenCache.token;
  }

  const response = await fetch(`${SUMUP_API_BASE}/token`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`SumUp Auth Error: ${response.status} ${err}`);
  }

  const data = await response.json();
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  return data.access_token;
}

export function isSumupConfigured(): boolean {
  return !!(
    process.env["SUMUP_CLIENT_ID"] &&
    process.env["SUMUP_CLIENT_SECRET"] &&
    process.env["SUMUP_API_KEY"] &&
    process.env["SUMUP_PAY_TO_EMAIL"]
  );
}

export async function createSumupCheckout(amountEur: number, userId: number, userEmail?: string): Promise<{
  id: string;
  checkout_reference: string;
  status: string;
}> {
  const token = await getAccessToken();
  const payToEmail = process.env["SUMUP_PAY_TO_EMAIL"];

  if (!payToEmail) {
    throw new Error("SUMUP_PAY_TO_EMAIL manquante");
  }

  const checkoutReference = `recharge_${userId}_${Date.now()}`;
  
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: checkoutReference,
      amount: amountEur,
      currency: "EUR",
      pay_to_email: payToEmail,
      description: `Recharge NexoShop - Utilisateur #${userId}`,
      hosted_checkout: { enabled: true }
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`SumUp API Error: ${response.status} ${JSON.stringify(err)}`);
  }

  return response.json();
}

export async function retrieveSumupCheckout(checkoutId: string): Promise<{
  status: string;
  amount: number;
  currency: string;
}> {
  const token = await getAccessToken();

  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`SumUp API Error: ${response.status}`);
  }

  return response.json();
}
