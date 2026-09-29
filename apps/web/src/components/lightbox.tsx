"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  imageUrl: string | null;
  url: string;
  details: string;
  onClose: () => void;
};

export function Lightbox({ open, imageUrl, url, details, onClose }: Props) {
  useEffect(() => {
    if (!open) return;

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
  }, [open, onClose]);

  if (!open) {
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

        <div className="thumb thumb-large">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={`Screenshot of ${url}`} />
          ) : null}
        </div>

        <div className="lightbox-meta">
          <div className="lightbox-url mono">{url}</div>
          <div className="lightbox-details">{details}</div>
        </div>
      </div>
    </div>
  );
}
