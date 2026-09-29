import { pgTable, pgEnum, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const statusEnum = pgEnum("status", ["completed", "failed"]);

export const screenshots = pgTable(
  "screenshots",
  {
    id: serial("id").primaryKey(),
    jobId: text("job_id").notNull().unique(),
    url: text("url").notNull(),
    viewport: text("viewport").notNull(),
    status: statusEnum("status").notNull(),
    imagePath: text("image_path"),
    failedReason: text("failed_reason"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("url_idx").on(table.url)],
);
