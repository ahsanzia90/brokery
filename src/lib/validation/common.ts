import { z } from "zod";
import { normalizePakistanPhone } from "@/lib/utils/phone";

export const phoneSchema = z
  .string()
  .trim()
  .min(7)
  .max(20)
  .transform((v, ctx) => {
    const n = normalizePakistanPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "invalid_phone" });
      return z.NEVER;
    }
    return n;
  });

export const otpCodeSchema = z.string().trim().regex(/^\d{6}$/, "invalid_code");

export const uuidSchema = z.string().uuid();
export const optionalUuid = z.union([uuidSchema, z.literal(""), z.null(), z.undefined()]).transform((v) => (v ? v : null));

export const positiveDecimal = z
  .union([z.string(), z.number()])
  .transform((v) => (typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim())))
  .refine((n) => Number.isFinite(n) && n > 0, "must_be_positive");

export const optionalDecimal = z
  .union([z.string(), z.number(), z.null(), z.undefined()])
  .transform((v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/,/g, "").trim());
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  })
  .refine((n) => n === null || !Number.isNaN(n), "invalid_number");

export const shortText = (max = 200) => z.string().trim().max(max);
export const optionalText = (max = 2000) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => (v ? v.trim().slice(0, max) : null));

export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "invalid_slug").max(120);

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
