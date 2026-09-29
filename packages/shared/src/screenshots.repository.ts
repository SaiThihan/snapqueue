import { eq } from "drizzle-orm";
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
