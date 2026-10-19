export type SeedAttribute = {
  key: string;
  nameEn: string;
  nameUr: string;
  type: "text" | "number" | "select" | "multiselect" | "boolean" | "date";
  unitLabel?: string;
  allowedValues?: string[];
  minValue?: string;
  maxValue?: string;
  isFilterable?: boolean;
  helpText?: string;
};

export const ATTRIBUTE_SEED: SeedAttribute[] = [
  { key: "broken_percent", nameEn: "Broken percentage", nameUr: "ٹوٹا فیصد", type: "number", unitLabel: "%", minValue: "0", maxValue: "100", isFilterable: true },
  { key: "grain_length", nameEn: "Grain length", nameUr: "دانے کی لمبائی", type: "text", unitLabel: "mm", helpText: "Average grain length, e.g. 7.4 mm" },
  { key: "moisture_percent", nameEn: "Moisture", nameUr: "نمی", type: "number", unitLabel: "%", minValue: "0", maxValue: "100", isFilterable: true },
  { key: "foreign_matter_percent", nameEn: "Foreign matter", nameUr: "غیر ضروری مواد", type: "number", unitLabel: "%", minValue: "0", maxValue: "100" },
  { key: "crop_year", nameEn: "Crop year", nameUr: "فصل کا سال", type: "text", helpText: "e.g. 2025" },
  { key: "origin_area", nameEn: "Origin / growing area", nameUr: "علاقہ / پیداوار کی جگہ", type: "text" },
  { key: "processing_type", nameEn: "Processing type", nameUr: "پروسیسنگ کی قسم", type: "select", allowedValues: ["raw", "parboiled_sella", "steam", "brown", "white"] },
  { key: "packaging_type", nameEn: "Packaging", nameUr: "پیکنگ", type: "select", allowedValues: ["pp_bag", "jute_bag", "paper_bag", "bulk_loose", "carton", "drum", "pallet", "bale", "roll", "other"] },
  { key: "certification", nameEn: "Certification / test details", nameUr: "سرٹیفکیٹ / ٹیسٹ", type: "text" },
  { key: "bag_weight_kg", nameEn: "Bag weight", nameUr: "بوری کا وزن", type: "number", unitLabel: "kg", minValue: "0" },
  { key: "cement_grade", nameEn: "Cement grade / type", nameUr: "سیمنٹ گریڈ", type: "select", allowedValues: ["OPC", "SRC", "PPC", "white", "slag", "other"], isFilterable: true },
  { key: "cement_brand", nameEn: "Brand", nameUr: "برانڈ", type: "text" },
  { key: "aggregate_size", nameEn: "Aggregate size", nameUr: "بجری کا سائز", type: "text", helpText: "e.g. 3/4 inch, 1/2 inch" },
  { key: "metal_grade", nameEn: "Metal grade", nameUr: "دھات کا گریڈ", type: "text", isFilterable: true, helpText: "e.g. Grade 60, SS 304" },
  { key: "thickness_mm", nameEn: "Thickness", nameUr: "موٹائی", type: "number", unitLabel: "mm", minValue: "0", isFilterable: true },
  { key: "diameter_mm", nameEn: "Diameter", nameUr: "قطر", type: "number", unitLabel: "mm", minValue: "0" },
  { key: "width_mm", nameEn: "Width", nameUr: "چوڑائی", type: "number", unitLabel: "mm", minValue: "0" },
  { key: "length_mm", nameEn: "Length", nameUr: "لمبائی", type: "number", unitLabel: "mm", minValue: "0" },
  { key: "purity_percent", nameEn: "Purity", nameUr: "خالص پن", type: "number", unitLabel: "%", minValue: "0", maxValue: "100", isFilterable: true },
  { key: "polymer_grade", nameEn: "Polymer grade", nameUr: "پولیمر گریڈ", type: "text", isFilterable: true },
  { key: "virgin_or_recycled", nameEn: "Virgin or recycled", nameUr: "نیا یا ری سائیکل", type: "select", allowedValues: ["virgin", "recycled", "mixed"], isFilterable: true },
  { key: "melt_flow_index", nameEn: "Melt flow index", nameUr: "میلٹ فلو انڈیکس", type: "number", unitLabel: "g/10 min", minValue: "0" },
  { key: "colour", nameEn: "Colour", nameUr: "رنگ", type: "text" },
  { key: "fibre_composition", nameEn: "Fibre composition", nameUr: "ریشے کی ترکیب", type: "text", helpText: "e.g. 100% cotton, 65/35 PC" },
  { key: "yarn_count", nameEn: "Yarn count", nameUr: "دھاگے کا کاؤنٹ", type: "text", helpText: "e.g. 20/1, 30/1" },
  { key: "gsm", nameEn: "GSM", nameUr: "جی ایس ایم", type: "number", unitLabel: "g/m²", minValue: "0", isFilterable: true },
  { key: "fabric_width", nameEn: "Width", nameUr: "چوڑائی (کپڑا)", type: "text", helpText: "e.g. 58 inch" },
  { key: "weave_type", nameEn: "Weave / knit type", nameUr: "بُنائی کی قسم", type: "text" },
  { key: "finish", nameEn: "Finish", nameUr: "فنش", type: "text" },
  { key: "paper_format", nameEn: "Format", nameUr: "فارمیٹ", type: "select", allowedValues: ["roll", "sheet"] },
  { key: "technical_grade", nameEn: "Technical grade", nameUr: "ٹیکنیکل گریڈ", type: "text" },
  { key: "concentration_percent", nameEn: "Concentration", nameUr: "ارتکاز", type: "number", unitLabel: "%", minValue: "0", maxValue: "100" },
  { key: "manufacturer", nameEn: "Manufacturer", nameUr: "تیار کنندہ", type: "text" },
  { key: "registration_number", nameEn: "Registration number", nameUr: "رجسٹریشن نمبر", type: "text", helpText: "Product registration / licence reference where required" },
  { key: "sds_available", nameEn: "Safety data sheet available", nameUr: "سیفٹی ڈیٹا شیٹ موجود", type: "boolean" },
  { key: "breed", nameEn: "Breed", nameUr: "نسل", type: "text" },
  { key: "age_months", nameEn: "Age", nameUr: "عمر", type: "number", unitLabel: "months", minValue: "0" },
  { key: "weight_kg", nameEn: "Weight", nameUr: "وزن", type: "number", unitLabel: "kg", minValue: "0" },
  { key: "health_documents", nameEn: "Health documentation", nameUr: "صحت کی دستاویزات", type: "text" },
  { key: "variety_size", nameEn: "Size", nameUr: "سائز", type: "text", helpText: "e.g. small / medium / large or count per box" },
  { key: "ripeness", nameEn: "Ripeness", nameUr: "پختگی", type: "select", allowedValues: ["unripe", "semi_ripe", "ripe"] },
  { key: "harvest_season", nameEn: "Harvest season", nameUr: "فصل کا موسم", type: "text" },
  { key: "model_number", nameEn: "Model number", nameUr: "ماڈل نمبر", type: "text" },
  { key: "serial_number", nameEn: "Serial number", nameUr: "سیریل نمبر", type: "text" },
  { key: "year_of_manufacture", nameEn: "Year of manufacture", nameUr: "تیاری کا سال", type: "text" },
  { key: "condition_notes", nameEn: "Condition notes", nameUr: "حالت کی تفصیل", type: "text" },
  { key: "contamination_percent", nameEn: "Contamination", nameUr: "آلودگی", type: "number", unitLabel: "%", minValue: "0", maxValue: "100" },
  { key: "pickup_available", nameEn: "Pickup available", nameUr: "پک اپ دستیاب", type: "boolean" },
];
