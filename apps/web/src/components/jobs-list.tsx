"use client";

import { ArrowRightIcon } from "./icons";
import { Thumbnail } from "./thumbnail";
import type { ScreenshotJob } from "@/types/screenshot";

type Props = {
  jobs: ScreenshotJob[];
  loading: boolean;
  onSelect: (job: ScreenshotJob) => void;
};

function hostFromUrl(value: string): string {
  try {
    return new URL(value).host.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function relativeTime(iso: string): string {
  const seconds = Math.max(
    0,
    Math.round((Date.now() - new Date(iso).getTime()) / 1000),
  );

  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return `${Math.round(hours / 24)}d ago`;
}

function statusNote(job: ScreenshotJob): string {
  if (job.status === "waiting") return "queued";
  if (job.status === "active") return "capturing…";
  if (job.status === "failed") {
    return job.failedReason
      ? job.failedReason.split("\n")[0]
      : "capture failed";
  }
  return relativeTime(job.createdAt);
}


export function JobsList({ jobs, loading, onSelect }: Props) {
  if (loading) {
    return (
      <section>
        <div className="section-head">
          <h2>Recent jobs</h2>
          <span>loading…</span>
        </div>
        <div className="jobs" />
      </section>
    );
  }

  return (
    <section>
      <div className="section-head">
        <h2>Recent jobs</h2>
        <span>polling every 1s</span>
      </div>

      <div className="jobs">
        {jobs.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            No screenshots yet — capture one above.
          </p>
        ) : null}

        {jobs.map((job) => (
          <div
            key={job.jobId}
            className="job"
            data-status={job.status}
            role={job.status === "completed" ? "button" : undefined}
            tabIndex={job.status === "completed" ? 0 : undefined}
            onClick={() => {
              if (job.status === "completed") onSelect(job);
            }}
            onKeyDown={(event) => {
              if (job.status === "completed" && event.key === "Enter") {
                onSelect(job);
              }
            }}
          >
            <Thumbnail job={job} />

            <div className="job-info">
              <div className="job-url mono">{hostFromUrl(job.url)}</div>
              <div className="job-meta">
                <span>{job.viewport}</span>
                <span className="sep">&middot;</span>
                <span className="mono">
                  {job.jobId.replace(/^shot_/, "").slice(0, 6)}
                </span>
                <span className="sep">&middot;</span>
                <span>{statusNote(job)}</span>
              </div>
            </div>

            <div className={`badge ${job.status}`}>
              <span className="dot" />
              {job.status}
            </div>

            <ArrowRightIcon className="job-arrow" />
          </div>
        ))}
      </div>
    </section>
  );
}
