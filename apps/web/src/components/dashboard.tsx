"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaptureForm } from "./capture-form";
import { JobsList } from "./jobs-list";
import { Lightbox } from "./lightbox";
import { Pipeline } from "./pipeline";
import { NODE, PipelineFxProvider, usePipelineFx } from "./pipeline-fx";
import { SiteHeader } from "./site-header";
import { useScreenshots } from "@/hooks/use-screenshots";
import type { ScreenshotEvent } from "@/hooks/use-screenshots";
import { useTheme } from "@/hooks/use-theme";
import type { ScreenshotJob } from "@/types/screenshot";

/**
 * Translates a real server-reported state change into a sequence of diagram
 * effects. Each branch describes hops that genuinely happened, in the order the
 * system performed them — e.g. a job only shows "Cached" once a poll has
 * actually observed the worker finish.
 */
function useEventAnimations() {
  const { pulseNode, flashLabel, flyPacket } = usePipelineFx();
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const timer of pending) clearTimeout(timer);
      pending.length = 0;
    };
  }, []);

  const at = useCallback((ms: number, fn: () => void) => {
    const timer = setTimeout(fn, ms);
    timers.current.push(timer);
  }, []);

  return useCallback(
    (event: ScreenshotEvent) => {
      switch (event.type) {
        // POST /screenshots: the request reaches the API, the job is enqueued,
        // then the 202 travels back to the browser.
        case "queued": {
          pulseNode(NODE.browser);
          flyPacket({ from: NODE.browser, to: NODE.api, label: "Request", icon: "request" });
          at(420, () => {
            pulseNode(NODE.api);
            flyPacket({ from: NODE.api, to: NODE.queue, label: "Enqueue", icon: "request" });
          });
          at(840, () => pulseNode(NODE.queue));
          at(860, () =>
            flyPacket({ from: NODE.queue, to: NODE.api, label: "202", icon: "ack" }),
          );
          at(1280, () =>
            flyPacket({ from: NODE.api, to: NODE.browser, label: "202", icon: "ack", variant: "return" }),
          );
          break;
        }

        // A poll reported `active`: the worker claimed the job and Chromium
        // started capturing.
        case "active": {
          flyPacket({ from: NODE.queue, to: NODE.worker, label: "Pickup", icon: "request" });
          at(420, () => {
            pulseNode(NODE.worker, "pulse");
            flyPacket({ from: NODE.worker, to: NODE.chromium, label: "Capture", icon: "request" });
          });
          at(840, () => pulseNode(NODE.chromium));
          break;
        }

        // A poll reported `completed`: the worker wrote the PNG, and the
        // result is now readable from Redis.
        case "completed": {
          pulseNode(NODE.chromium, "pulse-success");
          at(320, () => {
            flashLabel(NODE.worker, "Saved", "success");
            pulseNode(NODE.worker, "pulse-success");
          });
          at(700, () => {
            flashLabel(NODE.queue, "Cached", "success");
            pulseNode(NODE.queue, "pulse-success");
          });
          break;
        }

        // A poll reported `failed`. A DNS failure is thrown as an
        // UnrecoverableError, so the worker skips its retries entirely.
        case "failed": {
          pulseNode(NODE.chromium, "pulse-danger");
          at(320, () => {
            flashLabel(NODE.worker, "Failed", "danger");
            pulseNode(NODE.worker, "pulse-danger");
          });
          at(700, () => {
            flashLabel(NODE.queue, "No retry", "danger");
            pulseNode(NODE.queue, "pulse-danger");
          });
          break;
        }
      }
    },
    [pulseNode, flashLabel, flyPacket, at],
  );
}

function DashboardInner() {
  const { theme, toggle } = useTheme();
  const onEvent = useEventAnimations();
  const { jobs, submitting, error, loading, submit } = useScreenshots({ onEvent });
  const [selected, setSelected] = useState<ScreenshotJob | null>(null);

  const activeCount = useMemo(
    () => jobs.filter((job) => job.status === "active").length,
    [jobs],
  );

  const close = useCallback(() => setSelected(null), []);

  return (
    <>
      <div className="page">
        <SiteHeader theme={theme} onToggle={toggle} />

        <Pipeline activeCount={activeCount} />

        <CaptureForm onSubmit={submit} submitting={submitting} error={error} />

        <JobsList jobs={jobs} loading={loading} onSelect={setSelected} />

        <footer className="note">
          Live — submissions go through the Express API, queue in Redis via
          BullMQ, and the worker captures with Playwright. The browser polls
          status once a second; the server never blocks. Every packet above
          moves on a state change the server actually reported.
        </footer>
      </div>

      <Lightbox job={selected} onClose={close} />
    </>
  );
}

export function Dashboard() {
  return (
    <PipelineFxProvider>
      <DashboardInner />
    </PipelineFxProvider>
  );
}
