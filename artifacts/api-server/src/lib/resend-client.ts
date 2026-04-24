import { Resend } from "resend";

let cachedConnectorSettings: { settings: { api_key: string; from_email: string } } | undefined;

async function getCredentials() {
  // Direct env vars (production / VPS / any non-Replit env)
  const envApiKey = process.env.RESEND_API_KEY;
  const envFromEmail =
    process.env.RESEND_FROM_EMAIL ||
    process.env.MAIL_FROM ||
    process.env.FROM_EMAIL;
  if (envApiKey && envFromEmail) {
    return { apiKey: envApiKey, fromEmail: envFromEmail };
  }

  // Fallback: Replit Connectors (only available inside Replit dev/deploy)
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (hostname && xReplitToken) {
    const data = await fetch(
      "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      }
    ).then((res) => res.json());

    cachedConnectorSettings = data.items?.[0];

    if (cachedConnectorSettings && cachedConnectorSettings.settings.api_key) {
      return {
        apiKey: cachedConnectorSettings.settings.api_key,
        fromEmail:
          envFromEmail || cachedConnectorSettings.settings.from_email,
      };
    }
  }

  throw new Error(
    "Resend credentials missing. Set RESEND_API_KEY and RESEND_FROM_EMAIL environment variables.",
  );
}

// WARNING: Never cache this client. Always call this function fresh.
export async function getUncachableResendClient() {
  const { apiKey, fromEmail } = await getCredentials();
  return {
    client: new Resend(apiKey),
    fromEmail,
  };
}

export async function sendVerificationEmail(toEmail: string, firstName: string, code: string) {
  const { client, fromEmail } = await getUncachableResendClient();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0c14; color: #fff; padding: 32px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="background: linear-gradient(90deg, #a855f7, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 28px; margin: 0;">NexoShop</h1>
        <p style="color: #a1a1aa; font-size: 13px; margin-top: 4px;">Digital Goods · Instant Delivery</p>
      </div>
      <h2 style="color: #fff; font-size: 20px; margin-bottom: 12px;">Bonjour ${firstName} 👋</h2>
      <p style="color: #d4d4d8; line-height: 1.6;">
        Merci de t'inscrire sur NexoShop. Voici ton code de vérification :
      </p>
      <div style="background: linear-gradient(135deg, #a855f7, #ec4899); padding: 24px; border-radius: 12px; text-align: center; margin: 24px 0;">
        <p style="color: #fff; font-size: 36px; font-weight: 900; letter-spacing: 8px; margin: 0; font-family: monospace;">${code}</p>
      </div>
      <p style="color: #a1a1aa; font-size: 13px; line-height: 1.6;">
        Ce code expire dans <strong>15 minutes</strong>. Si tu n'as pas demandé cette inscription, ignore simplement cet email.
      </p>
      <hr style="border: none; border-top: 1px solid #27272a; margin: 24px 0;" />
      <p style="color: #71717a; font-size: 11px; text-align: center;">
        © NexoShop · Email envoyé automatiquement, ne pas répondre.
      </p>
    </div>
  `;
  return client.emails.send({
    from: fromEmail,
    to: toEmail,
    subject: `Ton code NexoShop : ${code}`,
    html,
  });
}
