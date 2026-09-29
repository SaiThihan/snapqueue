import type {
  JobStatusResponse,
  ScreenshotSummary,
  ViewportName,
} from "@/types/screenshot";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Absolute URL for an imageUrl returned by the API (which returns a path). */
export function resolveImageUrl(imageUrl: string | null): string | null {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${API_BASE_URL}${imageUrl}`;
}

async function readError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = (await response.json()) as { error?: string };
    return new Error(body.error ?? fallback);
  } catch {
    return new Error(fallback);
  }
}

export async function createScreenshot(input: {
  url: string;
  viewport: ViewportName;
}): Promise<{ jobId: string }> {
  const response = await fetch(`${API_BASE_URL}/screenshots`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await readError(response, "Failed to queue screenshot");
  }

  return (await response.json()) as { jobId: string };
}

export async function getJobStatus(
  jobId: string,
): Promise<JobStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/screenshots/${jobId}`, {
    cache: "no-store",
  });

  if (response.status === 404) {
    return { id: jobId, status: "failed", imageUrl: null };
  }

  if (!response.ok) {
    throw await readError(response, "Failed to read job status");
  }

  return (await response.json()) as JobStatusResponse;
}

export async function listScreenshots(
  limit = 20,
): Promise<ScreenshotSummary[]> {
  const response = await fetch(`${API_BASE_URL}/screenshots?limit=${limit}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw await readError(response, "Failed to load screenshots");
  }

  return (await response.json()) as ScreenshotSummary[];
}
