"use client";

import { useEffect, useRef } from "react";

/**
 * Decorative halftone dot field behind the hero.
 *
 * docs/decisions.md D13: the field spans the full hero section and reacts to the
 * pointer — dots near the cursor brighten and grow, then ease back when it leaves.
 * It never animates on its own, carries no meaning (`aria-hidden`), and renders a
 * single static frame under `prefers-reduced-motion`. Instrument surfaces keep
 * design.md §13.
 *
 * Canvas rather than SVG nodes: ~3k dots as DOM nodes would bloat the markup payload.
 * The section's `.dot-grid` layer is the no-JS fallback at the same 22px pitch; after the
 * first paint the effect marks that layer `data-dotfield="painted"` so the two layers
 * never draw on top of each other.
 */

/** Grid pitch in CSS px — must match `background-size` in globals.css `.dot-grid`. */
const GAP = 22;
/** Vertical centre of the ripple, as a fraction of the host height. */
const HORIZON = 0.44;
/** Ripple frequency across the field radius. */
const WAVE = 9;
/** Pointer influence radius in CSS px — dots inside this distance light up. */
const HOVER_RADIUS = 170;

export function DotField({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // The canvas fills the whole hero section, so measure that — not its direct wrapper.
    const section = canvas.closest("section");
    const host = section ?? canvas.parentElement;
    if (!host) return;
    const fallback = host.querySelector<HTMLElement>(".dot-grid");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pointer = { x: -Infinity, y: -Infinity, inside: false };
    const energy: number[] = [];
    let raf = 0;
    let running = false;

    const paint = (frame: number) => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (w === 0 || h === 0) return;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // Token-driven: the canvas inherits `color` from its host (see `text-text` at the call site).
      ctx.fillStyle = getComputedStyle(canvas).color;

      const cx = w / 2;
      const cy = h * HORIZON;
      const reach = Math.hypot(w / 2, h / 2);
      const cols = Math.ceil(w / GAP);
      const rows = Math.ceil(h / GAP);

      for (let row = 0; row <= rows; row++) {
        const y = GAP / 2 + row * GAP;
        if (y > h) continue;
        for (let col = 0; col <= cols; col++) {
          const x = GAP / 2 + col * GAP;
          if (x > w) continue;

          const d = Math.hypot(x - cx, y - cy) / reach;
          const wave = 0.5 + 0.5 * Math.sin(d * WAVE - 0.7);
          const falloff = Math.max(0, 1 - d * 1.15);

          let boost = 0;
          if (!reduced && pointer.inside) {
            const pd = Math.hypot(x - pointer.x, y - pointer.y) / HOVER_RADIUS;
            if (pd < 1) boost = Math.pow(1 - pd, 2);
          }
          const idx = row * (cols + 1) + col;
          const prev = energy[idx] ?? 0;
          // Ease toward the live field, then decay back to it on leave — never oscillates alone.
          const next = prev + (boost - prev) * 0.22;
          energy[idx] = next;

          const alpha = Math.min(1, falloff * (0.1 + 0.7 * wave * wave) + next * 0.75);
          if (alpha < 0.02) continue;
          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(x, y, 0.5 + wave * 1.1 + next * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (fallback) fallback.dataset.dotfield = "painted";

      // The loop only lives while there is pointer energy to render; resting D13 state is static.
      if (reduced) return;
      const active = energy.some((e) => e > 0.002);
      if (pointer.inside || active) {
        raf = requestAnimationFrame(() => paint(frame + 1));
      } else {
        running = false;
      }
    };

    const kick = () => {
      if (reduced) {
        paint(0);
        return;
      }
      if (!running) {
        running = true;
        raf = requestAnimationFrame(() => paint(0));
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
      pointer.inside = true;
      kick();
    };

    const onLeave = () => {
      pointer.inside = false;
      pointer.x = -Infinity;
      pointer.y = -Infinity;
      kick();
    };

    paint(0);
    const observer = new ResizeObserver(() => paint(0));
    observer.observe(host);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  );
}
