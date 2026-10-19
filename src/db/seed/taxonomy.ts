import type { SeedCategory } from "./taxonomy/types";
import { AGRICULTURE } from "./taxonomy/agriculture";
import { EDIBLE_OILS_FOOD, FRUITS_VEGETABLES, LIVESTOCK } from "./taxonomy/food";
import { AGRI_INPUTS } from "./taxonomy/inputs";
import { CHEMICALS, CONSTRUCTION, METALS, PLASTICS } from "./taxonomy/industrial";
import { ENERGY, MACHINERY, OTHER_BULK, PAPER_PACKAGING_WOOD, SCRAP, TEXTILE } from "./taxonomy/materials";

export type * from "./taxonomy/types";

/** Seed taxonomy (sections A–O of the product specification). Admin-editable after seeding. */
export const TAXONOMY_SEED: SeedCategory[] = [
  AGRICULTURE,
  FRUITS_VEGETABLES,
  EDIBLE_OILS_FOOD,
  LIVESTOCK,
  AGRI_INPUTS,
  METALS,
  CONSTRUCTION,
  CHEMICALS,
  PLASTICS,
  TEXTILE,
  PAPER_PACKAGING_WOOD,
  ENERGY,
  SCRAP,
  MACHINERY,
  OTHER_BULK,
];
