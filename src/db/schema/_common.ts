import { customType, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const id = () => uuid("id").primaryKey().defaultRandom();

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
};

/** PostgreSQL tsvector for full-text search. */
export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/** Shared localized-name shape used by taxonomy tables. */
export type LocalizedNames = { en: string; ur?: string; ur_roman?: string };

export const now = sql`now()`;
