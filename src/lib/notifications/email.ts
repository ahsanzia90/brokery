import "server-only";

/**
 * Minimal SMTP boundary. To keep dependencies light we do not bundle an SMTP
 * client; configure EMAIL_PROVIDER=smtp and install `nodemailer` to enable.
 * Until then this returns a truthful "not configured" result.
 */
export async function sendEmail(to: string, subject: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if ((process.env.EMAIL_PROVIDER ?? "none") !== "smtp" || !process.env.SMTP_HOST) {
    return { ok: false, error: "email_provider_not_configured" };
  }
  try {
    // Dynamic import so the app builds without nodemailer installed.
    const modName = "nodemailer";
    const nodemailer = (await import(/* webpackIgnore: true */ modName)) as {
      createTransport: (opts: unknown) => { sendMail: (m: unknown) => Promise<unknown> };
    };
    const transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    });
    await transport.sendMail({ from: process.env.EMAIL_FROM, to, subject, text });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
