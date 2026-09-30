"use client";

import { useEffect } from "react";
import { Thumbnail } from "./thumbnail";
import type { ScreenshotJob } from "@/types/screenshot";

type Props = {
  job: ScreenshotJob | null;
  onClose: () => void;
};

export function Lightbox({ job, onClose }: Props) {
  useEffect(() => {
    if (!job) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [job, onClose]);

  if (!job) {
    return (
      <div className="lightbox" aria-hidden="true">
        <div className="lightbox-backdrop" onClick={onClose} />
      </div>
    );
  }

  return (
    <div className="lightbox open" aria-hidden="false">
      <div className="lightbox-backdrop" onClick={onClose} />
      <div
        className="lightbox-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Screenshot result"
      >
        <button
          type="button"
          className="lightbox-close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <Thumbnail job={job} large />

        <div className="lightbox-meta">
          <div className="lightbox-url mono">
            {job.url} <span className="lightbox-details">&middot; {job.viewport}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
