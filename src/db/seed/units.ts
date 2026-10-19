export type SeedUnit = {
  code: string;
  nameEn: string;
  nameUr: string;
  symbol: string;
  unitType: "mass" | "volume" | "count" | "length" | "area" | "package";
  baseFactor?: string | null;
  conversionNote?: string;
  applicableKinds?: string[];
  sortOrder: number;
};

export const UNIT_SEED: SeedUnit[] = [
  { code: "kg", nameEn: "Kilogram", nameUr: "کلوگرام", symbol: "kg", unitType: "mass", baseFactor: "1", sortOrder: 1 },
  { code: "g", nameEn: "Gram", nameUr: "گرام", symbol: "g", unitType: "mass", baseFactor: "0.001", sortOrder: 2 },
  { code: "mt", nameEn: "Metric tonne", nameUr: "میٹرک ٹن", symbol: "MT", unitType: "mass", baseFactor: "1000", sortOrder: 3 },
  {
    code: "maund",
    nameEn: "Maund",
    nameUr: "من",
    symbol: "maund",
    unitType: "mass",
    baseFactor: "40",
    conversionNote:
      "Maund is treated as 40 kg (the common Pakistani trade definition). The factor is configurable in Admin → Settings (units.maund_kg); some markets use a different local maund, so always confirm with the counterparty.",
    sortOrder: 4,
  },
  { code: "bag40", nameEn: "40 kg bag", nameUr: "40 کلو بوری", symbol: "40 kg", unitType: "mass", baseFactor: "40", sortOrder: 5 },
  { code: "bag50", nameEn: "50 kg bag", nameUr: "50 کلو بوری", symbol: "50 kg", unitType: "mass", baseFactor: "50", sortOrder: 6 },
  { code: "bag100", nameEn: "100 kg bag", nameUr: "100 کلو بوری", symbol: "100 kg", unitType: "mass", baseFactor: "100", sortOrder: 7 },
  { code: "bag", nameEn: "Bag (unspecified weight)", nameUr: "بوری", symbol: "bag", unitType: "package", baseFactor: null, conversionNote: "Weight varies; not normalized.", sortOrder: 8 },
  { code: "sack", nameEn: "Sack", nameUr: "تھیلا", symbol: "sack", unitType: "package", baseFactor: null, sortOrder: 9 },
  { code: "piece", nameEn: "Piece", nameUr: "عدد", symbol: "pc", unitType: "count", baseFactor: "1", sortOrder: 10 },
  { code: "dozen", nameEn: "Dozen", nameUr: "درجن", symbol: "dz", unitType: "count", baseFactor: "12", sortOrder: 11 },
  { code: "head", nameEn: "Head (animal)", nameUr: "سر / جانور", symbol: "head", unitType: "count", baseFactor: "1", applicableKinds: ["livestock"], sortOrder: 12 },
  { code: "litre", nameEn: "Litre", nameUr: "لیٹر", symbol: "L", unitType: "volume", baseFactor: "1", sortOrder: 13 },
  { code: "ml", nameEn: "Millilitre", nameUr: "ملی لیٹر", symbol: "ml", unitType: "volume", baseFactor: "0.001", sortOrder: 14 },
  { code: "m3", nameEn: "Cubic metre", nameUr: "مکعب میٹر", symbol: "m³", unitType: "volume", baseFactor: "1000", sortOrder: 15 },
  { code: "ft3", nameEn: "Cubic foot", nameUr: "مکعب فٹ", symbol: "ft³", unitType: "volume", baseFactor: "28.316846", sortOrder: 16 },
  { code: "drum", nameEn: "Drum", nameUr: "ڈرم", symbol: "drum", unitType: "package", baseFactor: null, sortOrder: 17 },
  { code: "carton", nameEn: "Carton", nameUr: "کارٹن", symbol: "ctn", unitType: "package", baseFactor: null, sortOrder: 18 },
  { code: "bale", nameEn: "Bale", nameUr: "گانٹھ", symbol: "bale", unitType: "package", baseFactor: null, sortOrder: 19 },
  { code: "roll", nameEn: "Roll", nameUr: "رول", symbol: "roll", unitType: "package", baseFactor: null, sortOrder: 20 },
  { code: "truck", nameEn: "Truck load", nameUr: "ٹرک لوڈ", symbol: "truck", unitType: "package", baseFactor: null, conversionNote: "Truck capacity varies; specify tonnage in the description.", sortOrder: 21 },
  { code: "m", nameEn: "Metre", nameUr: "میٹر", symbol: "m", unitType: "length", baseFactor: "1", sortOrder: 22 },
  { code: "ft", nameEn: "Foot", nameUr: "فٹ", symbol: "ft", unitType: "length", baseFactor: "0.3048", sortOrder: 23 },
  { code: "sqm", nameEn: "Square metre", nameUr: "مربع میٹر", symbol: "m²", unitType: "area", baseFactor: "1", sortOrder: 24 },
  { code: "sqft", nameEn: "Square foot", nameUr: "مربع فٹ", symbol: "ft²", unitType: "area", baseFactor: "0.092903", sortOrder: 25 },
];
