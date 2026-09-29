import path from "node:path";

export const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR ?? "./screenshots";

export function screenshotFileName(jobId: string): string {
  return `screenshot-${jobId}.png`;
}

export function screenshotPath(jobId: string): string {
  return path.join(SCREENSHOT_DIR, screenshotFileName(jobId));
}

export function resolveInsideScreenshotDir(fileName: string): string | null {
  const base = path.resolve(SCREENSHOT_DIR);
  const target = path.resolve(base, fileName);

  if (target !== base && !target.startsWith(base + path.sep)) {
    return null;
  }

  return target;
}
