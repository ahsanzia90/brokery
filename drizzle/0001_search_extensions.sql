-- Extensions and indexes that the ORM schema cannot express.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Typo-tolerant search over commodity names and aliases.
CREATE INDEX IF NOT EXISTS commodities_name_trgm_idx ON commodities USING gin (lower(name_en) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS commodity_aliases_normalized_trgm_idx ON commodity_aliases USING gin (normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS commodity_varieties_name_trgm_idx ON commodity_varieties USING gin (lower(name_en) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS businesses_name_trgm_idx ON businesses USING gin (lower(name) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS locations_name_trgm_idx ON locations USING gin (lower(name_en) gin_trgm_ops);

-- Only one published price per (commodity, variety, grade, location, unit, price_type) at a time.
-- Superseded records are marked "superseded" by the application inside a transaction.
CREATE UNIQUE INDEX IF NOT EXISTS market_prices_one_published_uq
  ON market_prices (commodity_id, coalesce(variety_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(grade_id, '00000000-0000-0000-0000-000000000000'::uuid), location_id, unit_id, price_type)
  WHERE status = 'published';

-- Guard: price records must carry a unit and a date (also validated in app).
ALTER TABLE market_prices ADD CONSTRAINT market_prices_amount_positive CHECK (amount > 0);
ALTER TABLE listings ADD CONSTRAINT listings_quantity_positive CHECK (quantity > 0);
ALTER TABLE listings ADD CONSTRAINT listings_price_requires_unit CHECK (price_amount IS NULL OR price_unit_id IS NOT NULL);
ALTER TABLE rfqs ADD CONSTRAINT rfqs_quantity_positive CHECK (quantity > 0);
