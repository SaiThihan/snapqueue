import { Worker, UnrecoverableError } from "bullmq";
import { chromium } from "playwright";
import { createRedisConnection, SCREENSHOT_QUEUE, db, screenshots } from "@snapqueue/shared";

const browser = await chromium.launch();

const worker = new Worker(
  SCREENSHOT_QUEUE,
  async (job) => {
    console.log(`processing job ${job.id}`, job.data);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    const imagePath = `./screenshots/screenshot-${job.id}.png`;

    try {
      const page = await context.newPage();
      await page.goto(job.data.url, { timeout: 6000 });
      await page.screenshot({ path: imagePath });
      console.log("done");

      await db.insert(screenshots).values({
        jobId: String(job.id),
        url: job.data.url,
        viewport: job.data.viewport,
        status: "completed",
        imagePath,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`job ${job.id} failed:`, message);

      const isUnrecoverable = message.includes("net::ERR_NAME_NOT_RESOLVED");
      const attemptsExhausted = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);

      if (isUnrecoverable || attemptsExhausted) {
        await db.insert(screenshots).values({
          jobId: String(job.id),
          url: job.data.url,
          viewport: job.data.viewport,
          status: "failed",
          failedReason: message,
        });
      }

      if (isUnrecoverable) {
        throw new UnrecoverableError("Unrecoverable error: " + message);
      }
      throw err;
    } finally {
      await context.close();
    }
  },
  {
    connection: createRedisConnection(),
    concurrency: 3,
    limiter: { max: 10, duration: 60000 },
  },
);
