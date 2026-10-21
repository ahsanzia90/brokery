# Photo mode: supplying commodity photographs

The site has two visual modes. **Illustrations** (default) uses the built-in duotone artwork.
**Photo mode** shows real photographs wherever one exists, which is far clearer for buyers and
sellers who read little. Turn it on in **Admin → Settings → Appearance → Photo mode**, or preview
it for yourself only by opening `/api/visual?mode=photos` (`/api/visual?mode=default` clears it).

Where a photo is missing, the illustration is used, so you can fill the library gradually.
Images uploaded in Admin → Taxonomy on a category or commodity always take precedence.

## How to add photos

1. Put files in `assets/photos/` named exactly as below (`.jpg`, `.png` or `.webp`). Landscape,
   at least 1400px wide, the commodity filling most of the frame, natural light, no text overlays.
2. Run `npm run images:build`. It writes optimised `public/images/commodities/<key>.webp` files and
   updates `src/lib/visual/manifest.json`.
3. Commit `assets/photos`, `public/images/commodities` and the manifest, then deploy.

Use photographs you own or that are licensed for commercial use (your own mandi shots are best;
CC0 / Unsplash-licensed images are fine). Keep a note of the source for each file.

## File list

| File name | What to photograph |
| --- | --- |
| `hero-mandi.jpg` | Wide shot of a busy grain mandi with sacks and traders |
| `hero-trucks.jpg` | Loaded trucks at a market or warehouse |
| `rice.jpg` | Rice grains close-up or open rice sacks |
| `wheat.jpg` | Wheat grain or wheat ears |
| `maize.jpg` | Maize cobs or kernels |
| `pulses.jpg` | Mixed lentils and chana in sacks |
| `grains.jpg` | Sacks of assorted grains in a godown |
| `sugar.jpg` | White sugar or sugarcane |
| `oilseeds.jpg` | Mustard, sunflower or sesame seeds |
| `fodder.jpg` | Hay or silage bales |
| `mango.jpg` | Mangoes in crates |
| `kinnow.jpg` | Kinnow / oranges |
| `fruits.jpg` | Mixed fruit crates at a mandi |
| `potato.jpg` | Potatoes in sacks |
| `onion.jpg` | Onions in mesh bags |
| `tomato.jpg` | Tomatoes in crates |
| `vegetables.jpg` | Vegetable stall with mixed produce |
| `spices.jpg` | Red chilli, turmeric and whole spices |
| `edible-oil.jpg` | Edible oil in tins or bottles |
| `food-ingredients.jpg` | Flour, salt and food ingredients in a store |
| `cattle.jpg` | Cattle at a livestock market |
| `goats.jpg` | Goats and sheep |
| `poultry.jpg` | Poultry / broiler chickens |
| `animal-products.jpg` | Milk cans, hides or wool |
| `fertilizer.jpg` | Urea / DAP fertilizer bags |
| `seeds.jpg` | Seed packets or seed sacks |
| `crop-protection.jpg` | Agro-chemical bottles / sprayer |
| `farm-supplies.jpg` | Irrigation pipes, drip lines or farm tools |
| `steel-bars.jpg` | Stacked steel rebar (saria) |
| `steel-coils.jpg` | Steel coils / sheets |
| `non-ferrous.jpg` | Copper wire / aluminium ingots |
| `minerals.jpg` | Marble blocks or rock salt / limestone |
| `metals.jpg` | Metal stockyard |
| `cement.jpg` | Cement bags stacked |
| `bricks.jpg` | Brick stack / blocks |
| `sand-aggregate.jpg` | Sand and crush aggregate heap |
| `construction.jpg` | Construction site materials |
| `chemicals.jpg` | Chemical drums in a warehouse |
| `plastics.jpg` | Plastic granules / resin pellets |
| `rubber.jpg` | Rubber sheets or tyre rubber |
| `cotton.jpg` | Raw cotton bales |
| `yarn.jpg` | Yarn cones |
| `fabric.jpg` | Fabric rolls / denim |
| `paper.jpg` | Paper reels / kraft paper |
| `packaging.jpg` | Cartons and packaging |
| `timber.jpg` | Timber / plywood stack |
| `coal.jpg` | Coal heap |
| `energy.jpg` | Biomass, bagasse or fuel drums |
| `scrap.jpg` | Scrap metal yard |
| `machinery.jpg` | Industrial machine / workshop |
| `generic.jpg` | Warehouse with mixed goods |

The two `hero-*` images are used as the homepage banner in photo mode; the rest map to commodities
and categories by keyword (see `PHOTO_SPEC` in `src/lib/visual/photos.ts`). Add new keys there if you
want a finer mapping, e.g. a dedicated photo for a specific rice variety.
