import express, { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { Queue } from "bullmq";
import pino from "pino";
import { pinoHttp } from "pino-http";
import {
  createRedisConnection,
  SCREENSHOT_QUEUE,
  DEFAULT_VIEWPORT,
  VIEWPORT_NAMES,
  isViewportName,
} from "@snapqueue/shared";

const logger = pino({ transport: { target: "pino-pretty" } });

const app = express();
app.use(pinoHttp({ logger }));
app.use(express.json());

const queue = new Queue(SCREENSHOT_QUEUE, {
  connection: createRedisConnection(),
});

const redis = createRedisConnection();

async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = `rl:${req.ip}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60);
  }
  if (count > 10) {
    return res.status(429).json({ error: "too many requests" });
  }
  next();
}

function computeJobId(url: string, viewport: string) {
  const hash = crypto.createHash("sha256");
  hash.update(`${url}:${viewport}`);
  return `shot_${hash.digest("hex")}`;
}

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

app.post("/screenshots", rateLimiter, async (req, res) => {
  const { url, viewport = DEFAULT_VIEWPORT } = req.body ?? {};

  if (typeof url !== "string" || !isValidUrl(url)) {
    return res.status(400).json({ error: "invalid url" });
  }

  if (!isViewportName(viewport)) {
    return res.status(400).json({
      error: `viewport must be one of: ${VIEWPORT_NAMES.join(", ")}`,
    });
  }

  const job = await queue.add(
    "screenshot",
    { url, viewport },
    {
      jobId: computeJobId(url, viewport),
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { count: 15 },
    },
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

app.listen(3001, () => logger.info("API server listening on port 3001"));
