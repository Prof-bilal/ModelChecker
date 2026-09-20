"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, IconClose, IconArrowRightUp } from "@devigner-ui/icons";

/**
 * Scripted simulation of an evaluation run — explicitly labeled as a simulation
 * (§15: never present synthetic activity as real). No network calls are made.
 */

type CaseState = "pending" | "pass" | "fail";

const CASES: { id: string; cap: string; prompt: string; verdict: CaseState; ms: number }[] = [
  { id: "so-001", cap: "Structured output", prompt: "Extract invoice fields → JSON", verdict: "pass", ms: 900 },
  { id: "so-002", cap: "Structured output", prompt: "Nested schema, required enums", verdict: "pass", ms: 750 },
  { id: "if-001", cap: "Instruction following", prompt: "Two constraints + length limit", verdict: "pass", ms: 1100 },
  { id: "if-002", cap: "Instruction following", prompt: "Refuse politely + offer alt", verdict: "fail", ms: 950 },
  { id: "re-001", cap: "Reasoning", prompt: "3-step arithmetic word problem", verdict: "pass", ms: 1400 },
  { id: "re-002", cap: "Reasoning", prompt: "Constraint scheduling puzzle", verdict: "fail", ms: 1200 },
  { id: "so-003", cap: "Structured output", prompt: "Escaped quotes inside strings", verdict: "pass", ms: 800 },
  { id: "re-003", cap: "Reasoning", prompt: "Unit conversion chain", verdict: "pass", ms: 1000 },
];

export function LiveDemo() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [settled, setSettled] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const raf = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const passed = CASES.slice(0, settled).filter((c) => c.verdict === "pass").length;
  const failed = settled - passed;
  const spend = (settled * 0.0041).toFixed(4);

  function reset() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    setRunning(false);
    setDone(false);
    setSettled(0);
    setElapsed(0);
  }

  function run() {
    reset();
    setRunning(true);
    let acc = 0;
    CASES.forEach((c, i) => {
      acc += c.ms;
      timers.current.push(setTimeout(() => setSettled(i + 1), acc));
    });
    timers.current.push(
      setTimeout(() => {
        setRunning(false);
        setDone(true);
      }, acc + 300),
    );
    const t0 = performance.now();
    const tick = () => {
      setElapsed(performance.now() - t0);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  useEffect(() => {
    const ts = timers;
    const r = raf;
    return () => {
      ts.current.forEach(clearTimeout);
      if (r.current) cancelAnimationFrame(r.current);
    };
  }, []);

  const pct = Math.round((settled / CASES.length) * 100);

  return (
    <div
      className="overflow-hidden rounded-card border border-border bg-well font-mono text-xs"
      aria-label="Simulated evaluation run demo"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-4 py-3">
        <p className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${done ? "bg-success" : running ? "pulse-dot bg-accent" : "bg-text-muted"}`}
          />
          <span>openai/gpt-5.2-mini · Core v2.3 · 8 cases</span>
          <span className="rounded-pill border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
            Simulation
          </span>
        </p>
        <button
          type="button"
          onClick={running ? reset : run}
          className="inline-flex items-center gap-1.5 rounded-pill bg-accent px-3 py-1 text-[11px] font-medium text-on-accent hover:opacity-90"
        >
          {running ? "Stop" : done ? "Run again" : "Run"}
          <IconArrowRightUp aria-hidden="true" className="size-3 opacity-70" />
        </button>
      </div>

      <div
        className="grid grid-cols-4 gap-px border-b text-center"
        style={{ borderColor: "var(--color-border)", background: "var(--color-border)" }}
        role="status"
        aria-live="polite"
      >
        {[
          ["Settled", `${settled}/${CASES.length}`],
          ["Passed", String(passed)],
          ["Failed", String(failed)],
          ["Est. spend", `$${spend}`],
        ].map(([label, value]) => (
          <div key={label} className="px-2 py-2.5" style={{ background: "var(--color-surface)" }}>
            <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
            <p className="tnum mt-0.5 text-sm">{value}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pt-3">
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>{running ? "Running…" : done ? "Run completed (simulation)" : "Ready"}</span>
          <span className="tnum">{(elapsed / 1000).toFixed(1)}s elapsed</span>
        </div>
        <div
          className="mt-1.5 h-1 w-full overflow-hidden rounded-full"
          style={{ background: "var(--color-border)" }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Cases settled"
        >
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${pct}%`, transition: "width .3s ease" }}
          />
        </div>
      </div>

      <ul className="max-h-64 space-y-1 overflow-y-auto px-4 py-3" aria-label="Per-case results log">
        {CASES.slice(0, settled).map((c) => (
          <li key={c.id} className="log-line flex items-baseline justify-between gap-3">
            <span>
              {c.verdict === "pass" ? (
                <IconCheck aria-hidden="true" className="mr-1 inline size-3 text-success" />
              ) : (
                <IconClose aria-hidden="true" className="mr-1 inline size-3 text-danger" />
              )}
              <span className="sr-only">{c.verdict === "pass" ? "Passed:" : "Failed:"}</span>{" "}
              <span className="text-text-muted">[{c.cap}]</span> {c.prompt}
            </span>
            <span className="tnum shrink-0 text-text-muted">{c.ms}ms</span>
          </li>
        ))}
        {settled === 0 && (
          <li className="text-text-muted">
            {running ? "Scheduling cases…" : "Press Run to watch the evaluation."}
          </li>
        )}
      </ul>

      <p
        className="border-t px-4 py-2.5 text-[10px] text-text-muted"
        style={{ borderColor: "var(--color-border)" }}
        role="note"
      >
        Scripted simulation — no live model calls, no real charges. A real run
        executes 150 cases ×2 repeats against your provider and produces a
        report like this, with sample outputs and scoring rationale.
      </p>
    </div>
  );
}