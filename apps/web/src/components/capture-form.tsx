"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { CameraIcon, ChevronDownIcon, LinkIcon } from "./icons";
import type { ViewportName } from "@/types/screenshot";

const VIEWPORT_OPTIONS: { value: ViewportName; label: string }[] = [
  { value: "desktop", label: "Desktop · 1280×800" },
  { value: "tablet", label: "Tablet · 768×1024" },
  { value: "mobile", label: "Mobile · 390×844" },
];

type Props = {
  onSubmit: (input: { url: string; viewport: ViewportName }) => void;
  submitting: boolean;
  error: string | null;
};

export function CaptureForm({ onSubmit, submitting, error }: Props) {
  const [url, setUrl] = useState("https://example.com");
  const [viewport, setViewport] = useState<ViewportName>("desktop");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit({ url: trimmed, viewport });
  }

  return (
    <section className="card">
      <h2>New screenshot</h2>
      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <div className="field grow">
            <label htmlFor="url">Page URL</label>
            <div className="input-icon">
              <LinkIcon />
              <input
                id="url"
                type="text"
                inputMode="url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
              />
            </div>
          </div>

          <div className="field fixed">
            <label htmlFor="viewport">Viewport</label>
            <div className="select-wrap">
              <select
                id="viewport"
                value={viewport}
                onChange={(event) =>
                  setViewport(event.target.value as ViewportName)
                }
              >
                {VIEWPORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        <button type="submit" className="primary" disabled={submitting}>
          <CameraIcon />
          {submitting ? "Queueing…" : "Capture screenshot"}
        </button>
      </form>

      {error ? (
        <p role="alert" style={{ color: "var(--danger)", fontSize: 12.5 }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
