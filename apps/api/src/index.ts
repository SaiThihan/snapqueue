import express from "express";
import crypto from "node:crypto";
import { Queue } from "bullmq";
import { createRedisConnection, SCREENSHOT_QUEUE } from "@snapqueue/shared";

const app = express();
app.use(express.json());

const queue = new Queue(SCREENSHOT_QUEUE, {
  connection: createRedisConnection(),
});

function computeJobId(url: string, viewport: string) {
  const hash = crypto.createHash("sha256");
  hash.update(`${url}:${viewport}`);
  return `shot_${hash.digest("hex")}`;
}

app.post("/screenshots", async (req, res) => {
  const { url, viewport } = req.body;
  const job = await queue.add(
    "screenshot",
    { url, viewport },
    {
      jobId: computeJobId(url, viewport),
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    }
  );
  res.status(202).json({ jobId: job.id });
});

app.get("/screenshots/:id", async (req, res) => {
  const job = await queue.getJob(req.params.id);
  if (!job) {
    return res.status(404).json({ error: "job not found" });
  }
  const state = await job.getState();
  res.json({ id: job.id, status: state });
});

app.listen(3001, () => console.log("API server listening on port 3001"));
