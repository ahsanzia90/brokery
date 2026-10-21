# Photo mode: supplying commodity photographs

The site has two visual modes. **Illustrations** (default) uses the built-in duotone artwork.
**Photo mode** shows real photographs wherever one exists, which is far clearer for buyers and
sellers who read little. Turn it on in **Admin → Settings → Appearance → Photo mode**, or preview
it for yourself only by opening `/api/visual?mode=photos` (`/api/visual?mode=default` clears it).

Where a photo is missing, the illustration is used, so you can fill the library gradually.
Images uploaded in Admin → Taxonomy on a category or commodity always take precedence.

## Where the photos come from

The library is filled automatically. During every deployment `npm run images:build` resolves each
key in this order:

1. **Your own photo** in `assets/photos/<key>.jpg` (also `.png`, `.webp`, `.avif`). Always wins.
2. **Curated downloads** listed in `assets/photos/sources.json`: freely licensed photographs from
   Pexels (with Unsplash as a last resort, since Unsplash's download endpoint refuses build servers),
   chosen per key with one or two alternates. They are fetched at build time
   (the build server has internet access), checked to be real images of a usable size, resized and
   converted to WebP. Downloads are cached in `.next/cache/photos`, so unchanged keys do not hit the
   network on later builds.
3. **Bundled fallback** in `assets/photos/fallback/<key>.jpg`: a handful of smaller, verified photos
   used only if every download for that key fails.

A key with nothing available keeps its illustration. Every build also writes
`src/lib/visual/credits.json` and `public/images/commodities/CREDITS.md`, and the public page
`/photo-credits` lists the photographer, source page and licence of each photo in use.

Images uploaded in Admin → Taxonomy on a category or commodity always take precedence over all of the above.

## Replacing a photo with your own

1. Put the file in `assets/photos/` named exactly as in the list below. Landscape, at least 1400px
   wide, the commodity filling most of the frame, natural light, no text overlays.
2. Commit it (on GitHub: open the `assets/photos` folder → **Add file → Upload files**) and redeploy.

To change which download is used for a key, edit its entry in `assets/photos/sources.json`
(`{ "unsplash": "<photo id>" }`, `{ "pexels": <photo id> }` or `{ "url": "https://…" }`, with optional
`title`, `author`, `licence`). Use photographs you own or that are licensed for commercial use.

Build locally with `npm run images:build`; add `PHOTO_OFFLINE=1` to skip the network and use only
local files and cached downloads.

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
