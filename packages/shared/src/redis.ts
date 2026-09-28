import { Redis } from "ioredis";

export const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6380";

export const SCREENSHOT_QUEUE = "screenshots";

export function createRedisConnection() {
  return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
}
