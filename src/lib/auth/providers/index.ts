import "server-only";

export type OtpDeliveryResult = { ok: true; provider: string } | { ok: false; provider: string; error: string };

export interface OtpProvider {
  readonly name: string;
  readonly configured: boolean;
  send(phoneE164: string, code: string, ttlSeconds: number): Promise<OtpDeliveryResult>;
}

/** Development only: prints the code to the server log. Refuses to run in production. */
class ConsoleProvider implements OtpProvider {
  name = "console";
  get configured() {
    return process.env.NODE_ENV !== "production";
  }
  async send(phone: string, code: string): Promise<OtpDeliveryResult> {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, provider: this.name, error: "console OTP provider is not allowed in production" };
    }
    console.log(`\n[OTP][dev-only] code for ${phone}: ${code}\n`);
    return { ok: true, provider: this.name };
  }
}

/** Twilio Programmable SMS. Requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER. */
class TwilioProvider implements OtpProvider {
  name = "twilio";
  get configured() {
    return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER);
  }
  async send(phone: string, code: string, ttl: number): Promise<OtpDeliveryResult> {
    if (!this.configured) return { ok: false, provider: this.name, error: "Twilio credentials not configured" };
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const body = new URLSearchParams({
      To: phone,
      From: process.env.TWILIO_FROM_NUMBER!,
      Body: `${process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink"} code: ${code}. Valid for ${Math.round(ttl / 60)} minutes. Do not share it.`,
    });
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      });
      if (!res.ok) return { ok: false, provider: this.name, error: `Twilio HTTP ${res.status}` };
      return { ok: true, provider: this.name };
    } catch (e) {
      return { ok: false, provider: this.name, error: (e as Error).message };
    }
  }
}

/** Generic HTTP gateway: POST JSON {to, message} with Bearer token. Works with most Pakistani SMS gateways via a small adapter. */
class HttpGatewayProvider implements OtpProvider {
  name = "http";
  get configured() {
    return Boolean(process.env.SMS_HTTP_ENDPOINT);
  }
  async send(phone: string, code: string, ttl: number): Promise<OtpDeliveryResult> {
    if (!this.configured) return { ok: false, provider: this.name, error: "SMS_HTTP_ENDPOINT not configured" };
    try {
      const res = await fetch(process.env.SMS_HTTP_ENDPOINT!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SMS_HTTP_TOKEN ? { Authorization: `Bearer ${process.env.SMS_HTTP_TOKEN}` } : {}),
        },
        body: JSON.stringify({
          to: phone,
          message: `${process.env.NEXT_PUBLIC_BRAND_NAME ?? "MandiLink"} code: ${code}. Valid ${Math.round(ttl / 60)} min.`,
        }),
      });
      if (!res.ok) return { ok: false, provider: this.name, error: `Gateway HTTP ${res.status}` };
      return { ok: true, provider: this.name };
    } catch (e) {
      return { ok: false, provider: this.name, error: (e as Error).message };
    }
  }
}

export function getOtpProvider(): OtpProvider {
  const name = (process.env.OTP_PROVIDER ?? "console").toLowerCase();
  switch (name) {
    case "twilio":
      return new TwilioProvider();
    case "http":
      return new HttpGatewayProvider();
    case "console":
    default:
      return new ConsoleProvider();
  }
}
