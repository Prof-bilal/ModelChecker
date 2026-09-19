"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveal-on-scroll wrapper (IntersectionObserver, one-shot).
 * Falls back to fully visible with no transition under prefers-reduced-motion (globals.css).
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  /** stagger delay in ms */
  delay?: number;
  as?: "div" | "section" | "li" | "tr";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      // No IO support: reveal without animation via the effect cleanup-safe path
      requestAnimationFrame(() => setShown(true));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error dynamic tag ref typing
      ref={ref}
      className={`reveal ${shown ? "reveal--shown" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}