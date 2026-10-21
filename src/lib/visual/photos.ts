import manifest from "./manifest.json";

/**
 * Photo library for "photo mode" (for buyers and sellers who read little, a picture of the
 * actual maal says more than an icon). Files live in public/images/commodities/<key>.webp and
 * are produced from assets/photos/<key>.(jpg|png|webp) by `npm run images:build`, which also
 * regenerates manifest.json. Admin-uploaded images on a category/commodity always win.
 */
export const PHOTO_SPEC: Array<{ key: string; subject: string; match: string[] }> = [
  // hero / general
  { key: "hero-mandi", subject: "Wide shot of a busy grain mandi with sacks and traders", match: [] },
  { key: "hero-trucks", subject: "Loaded trucks at a market or warehouse", match: [] },
  // grains & pulses
  { key: "rice", subject: "Rice grains close-up or open rice sacks", match: ["rice", "basmati", "chawal", "paddy"] },
  { key: "wheat", subject: "Wheat grain or wheat ears", match: ["wheat", "gandum", "atta", "flour", "maida", "semolina"] },
  { key: "maize", subject: "Maize cobs or kernels", match: ["maize", "corn", "makai"] },
  { key: "pulses", subject: "Mixed lentils and chana in sacks", match: ["pulse", "lentil", "chana", "chickpea", "masoor", "moong", "mash", "beans", "peas", "cowpea"] },
  { key: "grains", subject: "Sacks of assorted grains in a godown", match: ["grain", "cereal", "barley", "sorghum", "millet", "oats"] },
  { key: "sugar", subject: "White sugar or sugarcane", match: ["sugar", "cheeni", "gur", "jaggery", "molasses", "sweetener", "sugarcane"] },
  { key: "oilseeds", subject: "Mustard, sunflower or sesame seeds", match: ["oilseed", "canola", "mustard", "sunflower", "sesame", "soybean", "flax", "groundnut", "peanut", "cottonseed"] },
  { key: "fodder", subject: "Hay or silage bales", match: ["fodder", "silage", "hay", "feed", "bran", "cake", "meal", "polish", "alfalfa"] },
  // fruit & veg
  { key: "mango", subject: "Mangoes in crates", match: ["mango"] },
  { key: "kinnow", subject: "Kinnow / oranges", match: ["kinnow", "orange", "lemon", "citrus"] },
  { key: "fruits", subject: "Mixed fruit crates at a mandi", match: ["fruit", "apple", "banana", "guava", "date", "grape", "pomegranate", "melon", "peach", "plum", "apricot", "pear", "strawberry", "papaya"] },
  { key: "potato", subject: "Potatoes in sacks", match: ["potato", "aloo"] },
  { key: "onion", subject: "Onions in mesh bags", match: ["onion", "pyaz"] },
  { key: "tomato", subject: "Tomatoes in crates", match: ["tomato"] },
  { key: "vegetables", subject: "Vegetable stall with mixed produce", match: ["vegetable", "garlic", "ginger", "okra", "eggplant", "brinjal", "cauliflower", "cabbage", "carrot", "radish", "turnip", "spinach", "cucumber", "gourd", "pumpkin", "capsicum"] },
  { key: "spices", subject: "Red chilli, turmeric and whole spices", match: ["spice", "chilli", "chili", "turmeric", "pepper", "cumin", "coriander", "fennel", "fenugreek", "cardamom", "clove", "cinnamon", "herb"] },
  // food ingredients
  { key: "edible-oil", subject: "Edible oil in tins or bottles", match: ["oil", "ghee"] },
  { key: "food-ingredients", subject: "Flour, salt and food ingredients in a store", match: ["ingredient", "starch", "salt", "dairy", "cocoa", "additive"] },
  // livestock
  { key: "cattle", subject: "Cattle at a livestock market", match: ["cattle", "buffalo", "cow", "livestock"] },
  { key: "goats", subject: "Goats and sheep", match: ["goat", "sheep"] },
  { key: "poultry", subject: "Poultry / broiler chickens", match: ["poultry", "chicken", "egg"] },
  { key: "animal-products", subject: "Milk cans, hides or wool", match: ["milk", "wool", "hide", "skin", "leather", "bone", "animal"] },
  // inputs
  { key: "fertilizer", subject: "Urea / DAP fertilizer bags", match: ["fertil", "urea", "dap", "npk", "ssp", "sop", "mop", "can", "ammonium", "zinc", "khad"] },
  { key: "seeds", subject: "Seed packets or seed sacks", match: ["seed", "beej"] },
  { key: "crop-protection", subject: "Agro-chemical bottles / sprayer", match: ["protection", "herbicide", "insecticide", "fungicide", "pesticide"] },
  { key: "farm-supplies", subject: "Irrigation pipes, drip lines or farm tools", match: ["irrigation", "pipe", "drip", "sprinkler", "greenhouse", "film", "cover", "tool", "tractor", "agricultural-machinery", "supplies"] },
  // metals & minerals
  { key: "steel-bars", subject: "Stacked steel rebar (saria)", match: ["bar", "rebar", "saria", "rod", "billet", "structural", "reinforcement"] },
  { key: "steel-coils", subject: "Steel coils / sheets", match: ["coil", "sheet", "galvan", "stainless", "mild", "cast", "pig", "ferrous", "iron-ore"] },
  { key: "non-ferrous", subject: "Copper wire / aluminium ingots", match: ["copper", "alumin", "brass", "zinc", "lead", "nickel", "tin", "non-ferrous", "tamba"] },
  { key: "minerals", subject: "Marble blocks or rock salt / limestone", match: ["mineral", "limestone", "gypsum", "silica", "salt", "marble", "granite", "dolomite", "feldspar", "kaolin"] },
  { key: "metals", subject: "Metal stockyard", match: ["metal", "steel", "iron", "loha"] },
  // construction
  { key: "cement", subject: "Cement bags stacked", match: ["cement", "clinker", "seemant"] },
  { key: "bricks", subject: "Brick stack / blocks", match: ["brick", "block", "eent"] },
  { key: "sand-aggregate", subject: "Sand and crush aggregate heap", match: ["sand", "crush", "aggregate", "gravel", "reti", "bajri"] },
  { key: "construction", subject: "Construction site materials", match: ["construction", "tiles", "glass", "lime", "bitumen", "asphalt", "concrete", "insulation", "ceramic", "board"] },
  // chemicals / plastics / textiles / paper / energy / scrap / machinery
  { key: "chemicals", subject: "Chemical drums in a warehouse", match: ["chemical", "acid", "alkali", "solvent", "resin", "adhesive", "pigment", "dye", "paint", "detergent"] },
  { key: "plastics", subject: "Plastic granules / resin pellets", match: ["plastic", "polymer", "pet", "hdpe", "ldpe", "pp", "pvc", "ps", "abs", "granule", "recycled"] },
  { key: "rubber", subject: "Rubber sheets or tyre rubber", match: ["rubber"] },
  { key: "cotton", subject: "Raw cotton bales", match: ["cotton", "kapas", "fibre", "fiber", "viscose", "polyester", "acrylic", "wool"] },
  { key: "yarn", subject: "Yarn cones", match: ["yarn", "dhaga", "thread"] },
  { key: "fabric", subject: "Fabric rolls / denim", match: ["fabric", "denim", "cloth", "knit", "woven", "textile", "waste"] },
  { key: "paper", subject: "Paper reels / kraft paper", match: ["paper", "kraft", "reel", "pulp", "kaghaz", "cardboard", "corrugated"] },
  { key: "packaging", subject: "Cartons and packaging", match: ["packag", "carton", "flexible"] },
  { key: "timber", subject: "Timber / plywood stack", match: ["timber", "wood", "plywood", "mdf", "particle", "lakri"] },
  { key: "coal", subject: "Coal heap", match: ["coal", "koyla"] },
  { key: "energy", subject: "Biomass, bagasse or fuel drums", match: ["energy", "fuel", "biomass", "bagasse", "petrol", "lubric"] },
  { key: "scrap", subject: "Scrap metal yard", match: ["scrap", "recycl", "kabaar", "battery"] },
  { key: "machinery", subject: "Industrial machine / workshop", match: ["machin", "equip", "pump", "motor", "electrical", "spare", "used"] },
  { key: "generic", subject: "Warehouse with mixed goods", match: [] },
];

const available = new Set<string>((manifest as { keys: string[] }).keys);

/** Pick the best photo key for a slug/name; returns null when no photo is available. */
export function photoKeyFor(...parts: Array<string | null | undefined>): string | null {
  const s = parts.filter(Boolean).join(" ").toLowerCase();
  if (!s) return null;
  for (const spec of PHOTO_SPEC) {
    if (spec.match.some((m) => s.includes(m)) && available.has(spec.key)) return spec.key;
  }
  return available.has("generic") ? "generic" : null;
}

export function photoSrc(key: string): string {
  return `/images/commodities/${key}.webp`;
}

export function hasPhoto(key: string): boolean {
  return available.has(key);
}

export const PHOTO_COUNT = available.size;
