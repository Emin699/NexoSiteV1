
const SUMUP_API_BASE = "https://api.sumup.com";

function getApiKey(): string {
  const apiKey = process.env["SUMUP_API_KEY"];
  if (!apiKey) throw new Error("SUMUP_API_KEY manquante");
  return apiKey;
}

export function isSumupConfigured(): boolean {
  return !!(
    process.env["SUMUP_API_KEY"] &&
    process.env["SUMUP_PAY_TO_EMAIL"]
  );
}

export async function createSumupCheckout(amountEur: number, userId: number, userEmail?: string): Promise<{
  id: string;
  checkout_reference: string;
  status: string;
}> {
  const apiKey = getApiKey();
  const payToEmail = process.env["SUMUP_PAY_TO_EMAIL"];

  if (!payToEmail) {
    throw new Error("SUMUP_PAY_TO_EMAIL manquante");
  }

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
      pay_to_email: payToEmail,
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
