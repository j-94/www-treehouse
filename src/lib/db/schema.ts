import { sql } from "drizzle-orm";
import { text, integer, real, sqliteTable } from "drizzle-orm/sqlite-core";

export const dispensaries = sqliteTable("dispensaries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  image_url: text("image_url"),
  description: text("description"),
  rating: real("rating"),
  review_count: integer("review_count"),
  created_at: text("created_at").default(sql`CURRENT_TIMESTAMP`),
  metadata: text("metadata", { mode: "json" }),
  thumbhash: text("thumbhash"),
});

export type Dispensary = typeof dispensaries.$inferSelect;
export type NewDispensary = typeof dispensaries.$inferInsert;

