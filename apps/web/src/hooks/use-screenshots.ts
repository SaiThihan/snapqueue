"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScreenshot,
  getJobStatus,
  listScreenshots,
} from "@/services/screenshots-api";
import { isTerminal } from "@/types/screenshot";
import type { ScreenshotJob, ViewportName } from "@/types/screenshot";

const POLL_INTERVAL_MS = 1000;

export function useScreenshots() {
  const [jobs, setJobs] = useState<ScreenshotJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // jobIds still being polled, kept in a ref so the interval never re-creates
  const pending = useRef<Set<string>>(new Set());

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
        live: false,
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
  }, [loadHistory]);

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

        merge([
          {
            jobId,
            url: input.url,
            viewport: input.viewport,
            status: "waiting",
            imageUrl: null,
            failedReason: null,
            createdAt: new Date().toISOString(),
            live: true,
          },
        ]);

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
    [merge],
  );

  return { jobs, submitting, error, loading, submit, reload: loadHistory };
}
