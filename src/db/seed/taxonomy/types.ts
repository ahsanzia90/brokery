export type SeedGrade = { slug: string; nameEn: string; nameUr?: string; description?: string };
export type SeedVariety = { slug: string; nameEn: string; nameUr?: string; aliasesRoman?: string[]; grades?: SeedGrade[] };
export type SeedAlias = { alias: string; language: "en" | "ur" | "ur_roman"; region?: string };
export type ListingKind = "commodity" | "agricultural_input" | "industrial_material" | "equipment" | "livestock" | "other";
export type ModerationLevel = "auto" | "review" | "restricted" | "prohibited";
export type SeedCommodity = {
  slug: string;
  nameEn: string;
  nameUr?: string;
  aliases?: SeedAlias[];
  varieties?: SeedVariety[];
  grades?: SeedGrade[];
  attributes?: string[];
  units?: string[];
  moderationLevel?: ModerationLevel;
  isPopular?: boolean;
  description?: string;
  supportsPriceBenchmark?: boolean;
};
export type SeedCategory = {
  slug: string;
  nameEn: string;
  nameUr?: string;
  aliasesRoman?: string[];
  icon?: string;
  description?: string;
  listingKind?: ListingKind;
  moderationLevel?: ModerationLevel;
  supportsGrades?: boolean;
  supportsPriceBenchmark?: boolean;
  attributes?: string[];
  units?: string[];
  isFeatured?: boolean;
  children?: SeedCategory[];
  commodities?: SeedCommodity[];
};

/** Helper: quick commodity with Urdu name and roman aliases. */
export function c(
  slug: string,
  nameEn: string,
  nameUr?: string,
  roman?: string[],
  extra?: Partial<SeedCommodity>,
): SeedCommodity {
  return {
    slug,
    nameEn,
    nameUr,
    aliases: roman?.map((a) => ({ alias: a, language: "ur_roman" as const })),
    ...extra,
  };
}

export function g(slug: string, nameEn: string, nameUr?: string): SeedGrade {
  return { slug, nameEn, nameUr };
}

export function v(slug: string, nameEn: string, nameUr?: string, aliasesRoman?: string[], grades?: SeedGrade[]): SeedVariety {
  return { slug, nameEn, nameUr, aliasesRoman, grades };
}
