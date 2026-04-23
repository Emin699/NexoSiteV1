// blueprint:javascript_resend integration
import { Resend } from "resend";

let connectionSettings: { settings: { api_key: string; from_email: string } } | undefined;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  const data = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=resend",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  ).then((res) => res.json());

  connectionSettings = data.items?.[0];

  if (!connectionSettings || !connectionSettings.settings.api_key) {
    throw new Error("Resend not connected");
  }
  return {
    apiKey: connectionSettings.settings.api_key,
    fromEmail: connectionSettings.settings.from_email,
  };
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
