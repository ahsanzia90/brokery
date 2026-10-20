import type { SVGProps } from "react";

/**
 * Duotone commodity illustrations in the brand palette. One coherent family used for
 * category tiles and listing placeholders until real photographs are uploaded through
 * Admin → Taxonomy (image slots are already supported). Keyword-matched on slugs so new
 * categories pick a sensible default without code changes.
 */
export type ArtKey =
  | "grains" | "fruits" | "vegetables" | "oils" | "livestock" | "inputs" | "metals" | "construction"
  | "chemicals" | "plastics" | "textiles" | "paper" | "energy" | "scrap" | "machinery" | "generic";

export function artKeyFor(slug: string | null | undefined, name?: string | null): ArtKey {
  const s = `${slug ?? ""} ${name ?? ""}`.toLowerCase();
  const has = (...k: string[]) => k.some((x) => s.includes(x));
  if (has("rice", "wheat", "grain", "cereal", "maize", "pulse", "lentil", "chana", "seed-oil", "oilseed", "fodder", "feed", "sugar", "flour")) return "grains";
  if (has("fruit", "mango", "kinnow", "apple", "banana", "date", "grape")) return "fruits";
  if (has("vegetable", "potato", "onion", "tomato", "spice", "chilli", "garlic")) return "vegetables";
  if (has("oil", "ghee", "molasses", "ingredient")) return "oils";
  if (has("livestock", "cattle", "poultry", "milk", "egg", "animal", "hide", "leather", "wool")) return "livestock";
  if (has("fertil", "urea", "dap", "input", "seed", "crop-protection", "pesticide", "herbicide", "irrigation")) return "inputs";
  if (has("textile", "cotton", "yarn", "fabric", "fibre", "fiber", "denim")) return "textiles";
  if (has("metal", "steel", "iron", "copper", "alumin", "brass", "mineral", "saria", "rebar")) return "metals";
  if (has("construction", "cement", "brick", "sand", "aggregate", "tiles", "marble", "gypsum", "bitumen")) return "construction";
  if (has("chemical", "acid", "solvent", "resin", "dye", "pigment")) return "chemicals";
  if (has("plastic", "polymer", "rubber", "pet", "hdpe", "pvc", "granule")) return "plastics";
  if (has("paper", "packag", "wood", "timber", "board", "carton", "pulp")) return "paper";
  if (has("energy", "fuel", "coal", "biomass", "petrol", "lubric", "bagasse")) return "energy";
  if (has("scrap", "recycl", "waste")) return "scrap";
  if (has("machin", "equip", "pump", "motor", "spare", "tool")) return "machinery";
  return "generic";
}

const INK = "#0f5b3d";
const INK2 = "#0b3d29";
const LIME = "#c7ef6e";
const CREAM = "#fff7e6";
const SOFT = "#8fd0a8";

function Frame({ children, ...rest }: SVGProps<SVGSVGElement> & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false" {...rest}>
      {children}
    </svg>
  );
}

const art: Record<ArtKey, (p: SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  grains: (p) => (
    <Frame {...p}>
      <path d="M30 58c0-10 8-16 30-16s30 6 30 16v34c0 6-4 10-10 10H40c-6 0-10-4-10-10V58Z" fill={INK} />
      <path d="M30 58c0 6 13 9 30 9s30-3 30-9" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
      <path d="M46 44c0-14 6-26 14-30 8 4 14 16 14 30" fill={LIME} />
      <path d="M60 14v30" stroke={INK2} strokeWidth="3" strokeLinecap="round" />
      <path d="M52 24c-6-2-10-6-12-12 6 0 11 4 14 10M68 24c6-2 10-6 12-12-6 0-11 4-14 10M52 34c-6-2-10-6-12-12 6 0 11 4 14 10M68 34c6-2 10-6 12-12-6 0-11 4-14 10" fill={SOFT} />
      <rect x="44" y="72" width="32" height="18" rx="3" fill={CREAM} />
      <path d="M50 81h20" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  ),
  fruits: (p) => (
    <Frame {...p}>
      <path d="M18 62h84l-8 34c-1 4-4 6-8 6H34c-4 0-7-2-8-6l-8-34Z" fill={INK} />
      <path d="M24 70h72" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
      <circle cx="42" cy="50" r="14" fill={LIME} />
      <circle cx="78" cy="50" r="14" fill={SOFT} />
      <circle cx="60" cy="40" r="14" fill="#f3b562" />
      <path d="M60 26c2-6 6-9 11-9-1 6-5 9-11 9Z" fill={INK2} />
    </Frame>
  ),
  vegetables: (p) => (
    <Frame {...p}>
      <ellipse cx="44" cy="72" rx="26" ry="22" fill={INK} />
      <path d="M44 50c-2-8 2-16 8-20" stroke={INK2} strokeWidth="4" strokeLinecap="round" />
      <path d="M52 30c8-4 16-2 20 4-8 4-16 2-20-4Z" fill={LIME} />
      <path d="M78 100c-10 0-16-10-14-20 2-12 10-22 20-28 10 6 18 16 20 28 2 10-4 20-14 20H78Z" fill={SOFT} />
      <path d="M84 60v40" stroke={CREAM} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  ),
  oils: (p) => (
    <Frame {...p}>
      <path d="M46 24h28v12l8 10v50c0 4-3 8-8 8H46c-5 0-8-4-8-8V46l8-10V24Z" fill={INK} />
      <rect x="50" y="16" width="20" height="10" rx="3" fill={INK2} />
      <path d="M44 62h32v24H44z" fill={CREAM} />
      <path d="M60 68c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12Z" fill="#f3b562" />
      <path d="M22 36c-6 8-8 13-8 17a8 8 0 0 0 16 0c0-4-2-9-8-17Z" fill={LIME} />
    </Frame>
  ),
  livestock: (p) => (
    <Frame {...p}>
      <path d="M26 56c0-14 10-22 24-22h20c14 0 24 8 24 22v16c0 4-2 8-6 10v14h-12V84H44v12H32V82c-4-2-6-6-6-10V56Z" fill={INK} />
      <path d="M30 44c-8-2-12-8-12-16 8 0 14 4 16 12M90 44c8-2 12-8 12-16-8 0-14 4-16 12" fill={LIME} />
      <circle cx="46" cy="56" r="4" fill={CREAM} />
      <circle cx="74" cy="56" r="4" fill={CREAM} />
      <rect x="48" y="66" width="24" height="12" rx="6" fill={SOFT} />
    </Frame>
  ),
  inputs: (p) => (
    <Frame {...p}>
      <path d="M34 30h52c4 0 8 4 8 8v56c0 4-4 8-8 8H34c-4 0-8-4-8-8V38c0-4 4-8 8-8Z" fill={INK} />
      <path d="M34 30c0-8 6-12 26-12s26 4 26 12" stroke={INK2} strokeWidth="6" />
      <rect x="40" y="52" width="40" height="30" rx="4" fill={CREAM} />
      <path d="M60 78c-10-2-14-10-12-20 10 2 14 10 12 20Z" fill={INK} />
      <path d="M60 78c10-2 14-10 12-20-10 2-14 10-12 20Z" fill={LIME} />
      <path d="M60 60v18" stroke={INK2} strokeWidth="2" strokeLinecap="round" />
    </Frame>
  ),
  metals: (p) => (
    <Frame {...p}>
      <rect x="16" y="78" width="88" height="14" rx="4" fill={INK} />
      <rect x="22" y="62" width="76" height="14" rx="4" fill={INK2} />
      <rect x="30" y="46" width="60" height="14" rx="4" fill={INK} />
      <rect x="40" y="30" width="40" height="14" rx="4" fill={SOFT} />
      <path d="M16 85h88M22 69h76M30 53h60" stroke={LIME} strokeWidth="2" strokeDasharray="6 6" />
    </Frame>
  ),
  construction: (p) => (
    <Frame {...p}>
      <path d="M26 48h48c4 0 6 2 6 6v40c0 4-2 6-6 6H26c-4 0-6-2-6-6V54c0-4 2-6 6-6Z" fill={INK} />
      <path d="M26 48l6-10h36l6 10" fill={INK2} />
      <rect x="30" y="64" width="40" height="22" rx="3" fill={CREAM} />
      <path d="M36 75h28" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="82" y="68" width="24" height="12" rx="2" fill="#d98c5f" />
      <rect x="86" y="82" width="24" height="12" rx="2" fill="#d98c5f" />
      <rect x="78" y="54" width="24" height="12" rx="2" fill={LIME} />
    </Frame>
  ),
  chemicals: (p) => (
    <Frame {...p}>
      <path d="M48 18h24v26l22 40c4 7-1 16-9 16H35c-8 0-13-9-9-16l22-40V18Z" fill={INK} />
      <rect x="44" y="12" width="32" height="10" rx="3" fill={INK2} />
      <path d="M38 72h44l10 18c2 4-1 6-4 6H32c-3 0-6-2-4-6l10-18Z" fill={LIME} />
      <circle cx="54" cy="84" r="3" fill={INK} />
      <circle cx="68" cy="80" r="2.5" fill={INK} />
    </Frame>
  ),
  plastics: (p) => (
    <Frame {...p}>
      <circle cx="40" cy="42" r="12" fill={INK} />
      <circle cx="72" cy="38" r="12" fill={SOFT} />
      <circle cx="56" cy="64" r="12" fill={LIME} />
      <circle cx="86" cy="66" r="12" fill={INK2} />
      <circle cx="34" cy="80" r="12" fill={INK} />
      <circle cx="66" cy="92" r="12" fill={SOFT} />
    </Frame>
  ),
  textiles: (p) => (
    <Frame {...p}>
      <rect x="38" y="24" width="44" height="72" rx="8" fill={INK} />
      <rect x="32" y="18" width="56" height="12" rx="6" fill={INK2} />
      <rect x="32" y="90" width="56" height="12" rx="6" fill={INK2} />
      <path d="M42 36h36M42 46h36M42 56h36M42 66h36M42 76h36" stroke={CREAM} strokeWidth="2" />
      <circle cx="96" cy="40" r="10" fill={LIME} />
      <circle cx="24" cy="80" r="10" fill={SOFT} />
    </Frame>
  ),
  paper: (p) => (
    <Frame {...p}>
      <path d="M30 40c0-10 8-16 18-16h42v60c0 10-8 16-18 16H30V40Z" fill={INK} />
      <ellipse cx="90" cy="24" rx="12" ry="30" fill={INK2} />
      <ellipse cx="90" cy="24" rx="5" ry="12" fill={CREAM} />
      <path d="M40 46h30M40 58h30M40 70h20" stroke={LIME} strokeWidth="3" strokeLinecap="round" />
    </Frame>
  ),
  energy: (p) => (
    <Frame {...p}>
      <path d="M22 96l12-26 16 6 10-20 14 14 10-18 14 44H22Z" fill={INK} />
      <path d="M60 24c-8 10-12 18-12 26a12 12 0 0 0 24 0c0-8-4-16-12-26Z" fill="#f3b562" />
      <path d="M60 40c-3 4-5 8-5 11a5 5 0 0 0 10 0c0-3-2-7-5-11Z" fill={LIME} />
    </Frame>
  ),
  scrap: (p) => (
    <Frame {...p}>
      <path d="M60 18l20 12v24L60 66 40 54V30l20-12Z" fill={INK} />
      <path d="M60 18v48M40 30l20 12 20-12" stroke={CREAM} strokeWidth="2" />
      <path d="M28 70c-8 8-8 20 0 28M92 70c8 8 8 20 0 28" stroke={INK2} strokeWidth="6" strokeLinecap="round" />
      <path d="M22 96l6 8 6-8M98 96l-6 8-6-8" fill={INK2} />
      <rect x="46" y="76" width="28" height="20" rx="4" fill={LIME} />
    </Frame>
  ),
  machinery: (p) => (
    <Frame {...p}>
      <circle cx="54" cy="60" r="30" fill={INK} />
      <circle cx="54" cy="60" r="12" fill={CREAM} />
      <path d="M54 22v10M54 88v10M16 60h10M82 60h10M27 33l7 7M74 80l7 7M27 87l7-7M74 40l7-7" stroke={INK} strokeWidth="8" strokeLinecap="round" />
      <circle cx="92" cy="30" r="12" fill={LIME} />
      <circle cx="92" cy="30" r="4" fill={INK2} />
    </Frame>
  ),
  generic: (p) => (
    <Frame {...p}>
      <path d="M24 44l36-18 36 18v40L60 102 24 84V44Z" fill={INK} />
      <path d="M24 44l36 18 36-18M60 62v40" stroke={CREAM} strokeWidth="2.5" />
      <rect x="66" y="30" width="18" height="18" rx="3" transform="rotate(27 75 39)" fill={LIME} />
    </Frame>
  ),
};

export function CommodityArt({ artKey, slug, name, className, ...rest }: { artKey?: ArtKey; slug?: string | null; name?: string | null; className?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const Key = art[artKey ?? artKeyFor(slug, name)];
  return <Key className={className} {...rest} />;
}

/** Background tint per art key so tiles read as a varied, intentional set. */
export const artTint: Record<ArtKey, string> = {
  grains: "bg-tint-sand",
  fruits: "bg-tint-peach",
  vegetables: "bg-tint-mint",
  oils: "bg-tint-sand",
  livestock: "bg-tint-peach",
  inputs: "bg-tint-mint",
  metals: "bg-tint-sky",
  construction: "bg-tint-sand",
  chemicals: "bg-tint-lavender",
  plastics: "bg-tint-sky",
  textiles: "bg-tint-rose",
  paper: "bg-tint-sand",
  energy: "bg-tint-peach",
  scrap: "bg-tint-sky",
  machinery: "bg-tint-lavender",
  generic: "bg-tint-mint",
};
