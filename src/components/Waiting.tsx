"use client";

import { useEffect, useState } from "react";

export function Waiting({
  title,
  detail,
  steps,
  compact = false,
}: {
  title: string;
  detail?: string;
  steps: readonly string[];
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const signature = steps.join("|");
  const step = steps[index] ?? steps[0] ?? "";

  useEffect(() => {
    const count = signature.split("|").filter(Boolean).length;
    if (count < 2) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 1500);
    return () => window.clearInterval(id);
  }, [signature]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        compact
          ? "flex items-center gap-4 rounded-2xl border border-line bg-surface px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
          : "tool-card flex items-center gap-5 px-5 py-5"
      }
    >
      <div className="relative grid h-16 w-16 shrink-0 place-items-center">
        <span className="spin-ring absolute inset-0 rounded-full border-2 border-[#f0d0cc] border-t-accent" />
        <div className="scan-doc" aria-hidden>
          <span />
          <span className="w-8" />
          <span />
          <span className="w-7" />
          <i className="scan-line" />
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tracking-tight text-ink">{title}</p>
        <p className="mt-1 text-sm text-ink">{step}</p>
        {detail ? <p className="mt-1 truncate text-xs font-medium text-muted">{detail}</p> : null}
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e7e7e7]">
          <div className="progress-bar h-full w-1/3 rounded-full bg-accent" />
        </div>
        <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {steps.map((item, itemIndex) => (
            <li
              key={item}
              className={`text-xs font-medium ${itemIndex === index ? "text-accent" : "text-muted"}`}
            >
              {itemIndex + 1}. {item}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton h-3 rounded-full"
          style={{ width: `${92 - (index % 3) * 14}%` }}
        />
      ))}
    </div>
  );
}
