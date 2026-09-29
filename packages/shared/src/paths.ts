import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Walks up from this file until it finds the package.json that declares
 * workspaces — i.e. the monorepo root.
 *
 * This exists because npm runs each workspace's scripts with that package as the
 * working directory, so a relative "./screenshots" resolves differently in the
 * worker than in the API. Anchoring to the repo root means both processes agree
 * regardless of where they were launched from.
 */
function findWorkspaceRoot(startDir: string): string {
  let dir = startDir;

  for (let depth = 0; depth < 10; depth += 1) {
    const manifest = path.join(dir, "package.json");

    if (fs.existsSync(manifest)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(manifest, "utf-8")) as {
          workspaces?: unknown;
        };
        if (Array.isArray(pkg.workspaces)) return dir;
      } catch {
        // unreadable manifest — keep walking
      }
    }

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return startDir;
}

const HERE = path.dirname(fileURLToPath(import.meta.url));

export const REPO_ROOT = findWorkspaceRoot(HERE);

/** A relative override is still resolved against the repo root, not the CWD. */
export const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR
  ? path.resolve(REPO_ROOT, process.env.SCREENSHOT_DIR)
  : path.join(REPO_ROOT, "screenshots");

function screenshotFileName(jobId: string): string {
  return `screenshot-${jobId}.png`;
}

export function screenshotPath(jobId: string): string {
  return path.join(SCREENSHOT_DIR, screenshotFileName(jobId));
}

export function ensureScreenshotDir(): void {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}
