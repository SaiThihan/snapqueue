"use client";

import { MoonIcon, SunIcon } from "./icons";

type Props = {
  theme: "light" | "dark";
  onToggle: () => void;
};

export function SiteHeader({ theme, onToggle }: Props) {
  return (
    <header className="top">
      <div className="brand">
        <div className="mark display">SQ</div>
        <div>
          <h1 className="display">SnapQueue</h1>
          <p>URL &rarr; PNG, queued and deduped</p>
        </div>
      </div>
      <button
        type="button"
        className="theme-toggle"
        onClick={onToggle}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </header>
  );
}
