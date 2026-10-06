"use client";

import { useEffect, useState } from "react";

/**
 * Live npm download count for the shipped CLI (D34).
 *
 * Fetched in the browser from npm's public downloads API, which is CORS-open,
 * so there is no API route and no server (MVP §6, D1) — one GET per page load,
 * cached 5 minutes by npm's CDN.
 *
 * The query asks from 2000-01-01; npm clamps any window to 18 months, which
 * today covers the package's whole life, so the figure is all-time. Until the
 * fetch settles — and if it fails — the chip shows an em dash: a missing
 * number is never rendered as 0 (Hard Rule 2, D4). No figure is ever invented
 * (Hard Rule 1, D5): the value on screen is the value npm returned.
 */
const PACKAGE = "modelcheck-cli";
const ALL_TIME_FROM = "2000-01-01";

export function NpmDownloads({ className = "" }: { className?: string }) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const today = new Date().toISOString().slice(0, 10);
    fetch(`https://api.npmjs.org/downloads/point/${ALL_TIME_FROM}:${today}/${PACKAGE}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { downloads?: number }) => {
        if (typeof data.downloads === "number") setCount(data.downloads);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  return (
    <span
      className={`border border-border-strong px-2 py-1 font-mono text-[11px] tracking-[0.08em] text-text-muted ${className}`}
      title="modelcheck-cli downloads on npm — fetched live from api.npmjs.org"
    >
      npm <span className="tnum text-text">{count === null ? "—" : count.toLocaleString("en-US")}</span>
      <span className="sr-only"> downloads for modelcheck-cli, live from npm</span>
    </span>
  );
}
