import { Worker } from "bullmq";
import { createRedisConnection, SCREENSHOT_QUEUE } from "@snapqueue/shared";

const worker = new Worker(SCREENSHOT_QUEUE, async (job) => {
  console.log(`processing job ${job.id}`, job.data);
  await new Promise((resolve) => setTimeout(resolve, 2000));
  console.log("done");
}, {
  connection: createRedisConnection(),
});
