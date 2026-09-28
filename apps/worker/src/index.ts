import { Worker, UnrecoverableError } from "bullmq";
import { chromium } from "playwright";
import { createRedisConnection, SCREENSHOT_QUEUE } from "@snapqueue/shared";

const browser = await chromium.launch();

const worker = new Worker(
  SCREENSHOT_QUEUE,
  async (job) => {
    console.log(`processing job ${job.id}`, job.data);

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });

    try {
      const page = await context.newPage();
      await page.goto(job.data.url, { timeout: 6000 });
      await page.screenshot({ path: `./screenshots/screenshot-${job.id}.png` });
      console.log("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`job ${job.id} failed:`, message);
      if (message.includes("net::ERR_NAME_NOT_RESOLVED")) {
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
