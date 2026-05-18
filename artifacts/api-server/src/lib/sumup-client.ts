
const SUMUP_API_BASE = "https://api.sumup.com";

function getApiKey(): string {
  const apiKey = process.env["SUMUP_API_KEY"];
  if (!apiKey) throw new Error("SUMUP_API_KEY manquante");
  return apiKey;
}

export function isSumupConfigured(): boolean {
  return !!process.env["SUMUP_API_KEY"];
}

let cachedMerchantCode: string | null = null;

async function getMerchantCode(): Promise<string> {
  if (cachedMerchantCode) return cachedMerchantCode;

  const envCode = process.env["SUMUP_MERCHANT_CODE"];
  if (envCode) {
    cachedMerchantCode = envCode;
    return envCode;
  }

  const apiKey = getApiKey();
  const response = await fetch(`${SUMUP_API_BASE}/v0.1/me/merchant-profile`, {
    method: "GET",
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    const err = await response.text().catch(() => "");
    throw new Error(`SumUp merchant-profile error: ${response.status} ${err}`);
  }

  const data = await response.json() as { merchant_code?: string };
  if (!data.merchant_code) {
    throw new Error("SumUp: merchant_code introuvable dans le profil");
  }

  cachedMerchantCode = data.merchant_code;
  return data.merchant_code;
}

export async function createSumupCheckout(amountEur: number, userId: number, _userEmail?: string): Promise<{
  id: string;
  checkout_reference: string;
  status: string;
}> {
  const apiKey = getApiKey();
  const merchantCode = await getMerchantCode();

  const checkoutReference = `recharge_${userId}_${Date.now()}`;

  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      checkout_reference: checkoutReference,
      amount: amountEur,
      currency: "EUR",
      merchant_code: merchantCode,
      description: `Recharge NexoShop - Utilisateur #${userId}`,
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
  const apiKey = getApiKey();

  const response = await fetch(`${SUMUP_API_BASE}/v0.1/checkouts/${checkoutId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`SumUp API Error: ${response.status}`);
  }

  return response.json();
}
