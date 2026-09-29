import { and, desc, eq } from "drizzle-orm";
import { db } from "./db.js";
import { screenshots } from "./schema.js";

export type ScreenshotRow = typeof screenshots.$inferSelect;

export async function findScreenshotByJobId(
  jobId: string,
): Promise<ScreenshotRow | null> {
  const rows = await db
    .select()
    .from(screenshots)
    .where(eq(screenshots.jobId, jobId))
    .limit(1);

  return rows[0] ?? null;
}

export async function listScreenshots(options?: {
  limit?: number;
  url?: string;
}): Promise<ScreenshotRow[]> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
  const conditions = options?.url
    ? eq(screenshots.url, options.url)
    : undefined;

  return db
    .select()
    .from(screenshots)
    .where(conditions ? and(conditions) : undefined)
    .orderBy(desc(screenshots.createdAt))
    .limit(limit);
}

export type ScreenshotSummary = {
  jobId: string;
  url: string;
  viewport: string;
  status: "completed" | "failed";
  imageUrl: string | null;
  failedReason: string | null;
  createdAt: string;
};

export function toScreenshotSummary(row: ScreenshotRow): ScreenshotSummary {
  return {
    jobId: row.jobId,
    url: row.url,
    viewport: row.viewport,
    status: row.status,
    imageUrl: row.status === "completed" ? `/screenshots/${row.jobId}/image` : null,
    failedReason: row.failedReason,
    createdAt: row.createdAt.toISOString(),
  };
}
