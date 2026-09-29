"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScreenshot,
  getJobStatus,
  listScreenshots,
} from "@/services/screenshots-api";
import { isTerminal } from "@/types/screenshot";
import type {
  JobStatus,
  ScreenshotJob,
  ViewportName,
} from "@/types/screenshot";

const POLL_INTERVAL_MS = 1000;

/** Real state changes, reported so the pipeline can visualise what actually happened. */
export type ScreenshotEvent =
  | { type: "queued"; jobId: string }
  | { type: "active"; jobId: string }
  | { type: "completed"; jobId: string }
  | { type: "failed"; jobId: string };

type Options = {
  onEvent?: (event: ScreenshotEvent) => void;
};

export function useScreenshots({ onEvent }: Options = {}) {
  const [jobs, setJobs] = useState<ScreenshotJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // jobIds still being polled, kept in a ref so the interval never re-creates
  const pending = useRef<Set<string>>(new Set());

  // last status the server reported per job, used to detect real transitions
  const seen = useRef<Map<string, JobStatus>>(new Map());

  const merge = useCallback((incoming: ScreenshotJob[]) => {
    setJobs((current) => {
      const byId = new Map(current.map((job) => [job.jobId, job]));
      for (const job of incoming) byId.set(job.jobId, job);
      return [...byId.values()].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    });
  }, []);

  const loadHistory = useCallback(async () => {
    const rows = await listScreenshots(20);
    merge(
      rows.map((row) => ({
        jobId: row.jobId,
        url: row.url,
        viewport: row.viewport,
        status: row.status,
        imageUrl: row.imageUrl,
        failedReason: row.failedReason,
        createdAt: row.createdAt,
      })),
    );
  }, [merge]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        await loadHistory();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  const poll = useCallback(async () => {
    const ids = [...pending.current];
    if (ids.length === 0) return;

    const results = await Promise.all(
      ids.map(async (jobId) => {
        try {
          const status = await getJobStatus(jobId);
          if (isTerminal(status.status)) pending.current.delete(jobId);
          return { jobId, status: status.status, imageUrl: status.imageUrl };
        } catch {
          return null;
        }
      }),
    );

    const updates = results.filter((r) => r !== null);
    if (updates.length === 0) return;

    // Emit only on an actual change, so the diagram reacts to transitions the
    // server reported rather than to every routine poll.
    for (const update of updates) {
      const before = seen.current.get(update.jobId);
      seen.current.set(update.jobId, update.status);
      if (before === update.status) continue;

      if (update.status === "active") {
        onEvent?.({ type: "active", jobId: update.jobId });
      } else if (update.status === "completed") {
        onEvent?.({ type: "completed", jobId: update.jobId });
      } else if (update.status === "failed") {
        onEvent?.({ type: "failed", jobId: update.jobId });
      }
    }

    setJobs((current) =>
      current.map((job) => {
        const update = updates.find((u) => u.jobId === job.jobId);
        if (!update) return job;
        return {
          ...job,
          status: update.status,
          imageUrl: update.imageUrl ?? job.imageUrl,
        };
      }),
    );

    if (updates.some((u) => isTerminal(u.status))) {
      void loadHistory();
    }
  }, [loadHistory, onEvent]);

  useEffect(() => {
    const timer = setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [poll]);

  const submit = useCallback(
    async (input: { url: string; viewport: ViewportName }) => {
      setSubmitting(true);
      setError(null);

      try {
        const { jobId } = await createScreenshot(input);

        pending.current.add(jobId);
        seen.current.set(jobId, "waiting");

        merge([
          {
            jobId,
            url: input.url,
            viewport: input.viewport,
            status: "waiting",
            imageUrl: null,
            failedReason: null,
            createdAt: new Date().toISOString(),
          },
        ]);

        onEvent?.({ type: "queued", jobId });

        return jobId;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to queue screenshot";
        setError(message);
        return null;
      } finally {
        setSubmitting(false);
      }
    },
    [merge, onEvent],
  );

  return { jobs, submitting, error, loading, submit };
}
