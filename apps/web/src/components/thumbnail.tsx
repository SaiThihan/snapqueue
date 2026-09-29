"use client";

import { resolveImageUrl } from "@/services/screenshots-api";
import { WarningIcon } from "./icons";
import type { ScreenshotJob } from "@/types/screenshot";

function ChromeBar() {
  return (
    <div className="chrome">
      <span className="tl r" />
      <span className="tl y" />
      <span className="tl g" />
      <span className="bar" />
    </div>
  );
}

type Props = {
  job: ScreenshotJob;
  large?: boolean;
};

/**
 * The window-frame thumbnail. The .chrome / .art structure is required by the
 * stylesheet — .thumb is a fixed-size flex column and .art is what gives the
 * image its height, so an <img> placed directly in .thumb collapses.
 */
export function Thumbnail({ job, large = false }: Props) {
  const imageUrl = resolveImageUrl(job.imageUrl);

  return (
    <div className={large ? "thumb thumb-large" : "thumb"}>
      <ChromeBar />
      <div className="art">
        {job.status === "completed" && imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={`Screenshot of ${job.url}`} />
        ) : job.status === "failed" ? (
          <div className="failed-icon">
            <WarningIcon />
          </div>
        ) : (
          <div className="skeleton" />
        )}
      </div>
    </div>
  );
}
