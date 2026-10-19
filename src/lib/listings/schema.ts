import { z } from "zod";
import { optionalText, optionalDecimal, positiveDecimal } from "@/lib/validation/common";

const uuidOrNull = z
  .union([z.string().uuid(), z.literal(""), z.null(), z.undefined()])
  .optional()
  .transform((v) => (v ? v : null));

export const PRICE_TYPES = ["fixed", "negotiable", "quote", "on_contact"] as const;
export const DELIVERY_OPTIONS = ["yes", "no", "ask"] as const;
export const CONDITIONS = ["new", "used", "refurbished", "fresh", "stored", "not_applicable"] as const;

export const listingImageSchema = z.object({
  path: z.string().regex(/^listings\/[0-9]{4}\/[0-9]{2}\/[a-f0-9]+\.webp$/, "invalid_path"),
  altText: optionalText(150).optional(),
});

export const listingDocumentSchema = z.object({
  path: z.string().regex(/^listing-docs\/[0-9a-f-]{36}\/[0-9]{4}\/[0-9]{2}\/[a-f0-9]+\.(pdf|png|jpg|webp)$/, "invalid_path"),
  label: z.string().trim().min(1).max(100),
  mimeType: z.string().max(60),
  sizeBytes: z.number().int().positive(),
  isPublic: z.boolean().default(false),
});

export const listingPayloadSchema = z
  .object({
    commodityId: z.string().uuid(),
    varietyId: uuidOrNull,
    customVariety: optionalText(100).optional(),
    gradeId: uuidOrNull,
    customGrade: optionalText(100).optional(),
    title: z.string().trim().min(3, "min").max(120, "max"),
    quantity: positiveDecimal,
    unitId: z.string().uuid(),
    minOrderQuantity: optionalDecimal.optional(),
    minOrderUnitId: uuidOrNull,
    priceType: z.enum(PRICE_TYPES),
    priceAmount: optionalDecimal.optional(),
    priceUnitId: uuidOrNull,
    provinceId: uuidOrNull,
    districtId: uuidOrNull,
    cityId: uuidOrNull,
    marketId: uuidOrNull,
    pickupLocation: optionalText(200).optional(),
    deliveryAvailable: z.enum(DELIVERY_OPTIONS).default("ask"),
    condition: z.enum(CONDITIONS).default("not_applicable"),
    packaging: optionalText(120).optional(),
    availableFrom: z
      .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null(), z.undefined()])
      .optional()
      .transform((v) => (v ? v : null)),
    description: optionalText(4000).optional(),
    images: z.array(listingImageSchema).max(12).default([]),
    documents: z.array(listingDocumentSchema).max(6).default([]),
    attributes: z.record(z.string().uuid(), z.string().max(200)).default({}),
    contactPhoneEnabled: z.boolean().default(true),
    contactWhatsappEnabled: z.boolean().default(true),
    submit: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if ((d.priceType === "fixed" || d.priceType === "negotiable") && d.submit) {
      if (d.priceAmount === null || d.priceAmount === undefined || !(d.priceAmount > 0)) ctx.addIssue({ code: "custom", path: ["priceAmount"], message: "required" });
      if (!d.priceUnitId) ctx.addIssue({ code: "custom", path: ["priceUnitId"], message: "required" });
    }
    if (d.priceAmount && !d.priceUnitId) ctx.addIssue({ code: "custom", path: ["priceUnitId"], message: "required" });
    if (d.submit && !d.cityId) ctx.addIssue({ code: "custom", path: ["cityId"], message: "required" });
    if (d.minOrderQuantity && !d.minOrderUnitId) ctx.addIssue({ code: "custom", path: ["minOrderUnitId"], message: "required" });
  });

export type ListingPayload = z.input<typeof listingPayloadSchema>;
export type ListingPayloadParsed = z.output<typeof listingPayloadSchema>;

export const STATUS_ACTIONS = ["pause", "resume", "sold_out", "available", "remove", "refresh"] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];
