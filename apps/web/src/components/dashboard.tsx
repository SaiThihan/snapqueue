"use client";

import { useCallback, useMemo, useState } from "react";
import { CaptureForm } from "./capture-form";
import { JobsList } from "./jobs-list";
import { Lightbox } from "./lightbox";
import { Pipeline } from "./pipeline";
import { SiteHeader } from "./site-header";
import { useScreenshots } from "@/hooks/use-screenshots";
import { useTheme } from "@/hooks/use-theme";
import { resolveImageUrl } from "@/services/screenshots-api";
import type { ScreenshotJob } from "@/types/screenshot";

export function Dashboard() {
  const { theme, toggle } = useTheme();
  const { jobs, submitting, error, loading, submit } = useScreenshots();
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
          status once a second; the server never blocks.
        </footer>
      </div>

      <Lightbox
        open={selected !== null}
        imageUrl={resolveImageUrl(selected?.imageUrl ?? null)}
        url={selected?.url ?? ""}
        details={
          selected
            ? `${selected.viewport} · ${selected.jobId}`
            : ""
        }
        onClose={close}
      />
    </>
  );
}
