import Stripe from "stripe";

let cached: Stripe | null = null;

function getConfig(): { secretKey: string; publishableKey: string } | null {
  const secretKey = process.env["STRIPE_SECRET_KEY"];
  const publishableKey = process.env["STRIPE_PUBLISHABLE_KEY"];
  if (!secretKey || !publishableKey) return null;
  return { secretKey, publishableKey };
}

export function isStripeConfigured(): boolean {
  return getConfig() !== null;
}

export function getPublishableKey(): string | null {
  return getConfig()?.publishableKey ?? null;
}

export function getStripe(): Stripe {
  const cfg = getConfig();
  if (!cfg) throw new Error("Stripe not configured");
  if (cached) return cached;
  cached = new Stripe(cfg.secretKey, {
    apiVersion: "2025-09-30.clover",
    typescript: true,
  });
  return cached;
}

export async function createPaymentIntent(amountEur: number, userId: number): Promise<{
  id: string;
  clientSecret: string;
}> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(amountEur * 100),
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    description: `Recharge NexoShop`,
    metadata: { userId: String(userId), source: "nexoshop_wallet" },
  });
  if (!intent.client_secret) {
    throw new Error("Stripe did not return a client_secret");
  }
  return { id: intent.id, clientSecret: intent.client_secret };
}

export async function retrieveIntent(intentId: string): Promise<{
  status: string;
  amountEur: number;
  paymentMethodType: string | null;
}> {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(intentId, {
    expand: ["payment_method"],
  });
  const pm = intent.payment_method;
  let paymentMethodType: string | null = null;
  if (pm && typeof pm === "object" && "type" in pm) {
    paymentMethodType = pm.type;
  }
  return {
    status: intent.status,
    amountEur: intent.amount / 100,
    paymentMethodType,
  };
}
