export type JobStatus = "waiting" | "active" | "completed" | "failed";

export type ViewportName = "mobile" | "tablet" | "desktop";

export type ScreenshotSummary = {
  jobId: string;
  url: string;
  viewport: string;
  status: "completed" | "failed";
  imageUrl: string | null;
  failedReason: string | null;
  createdAt: string;
};

export type JobStatusResponse = {
  id: string;
  status: JobStatus;
  imageUrl: string | null;
};

export type ScreenshotJob = {
  jobId: string;
  url: string;
  viewport: string;
  status: JobStatus;
  imageUrl: string | null;
  failedReason: string | null;
  createdAt: string;
  live: boolean;
};

export const TERMINAL_STATUSES: readonly JobStatus[] = ["completed", "failed"];

export function isTerminal(status: JobStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
