"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const REST = { x: 8, y: -22 };

const LEAVES = ["leaf-1", "leaf-2", "leaf-3", "leaf-4"] as const;

export function DocumentScene({ open, reading = false }: { open: boolean; reading?: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(REST);

  useEffect(() => {
    const parent = stageRef.current?.parentElement;
    if (!parent) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;

    const rest = () => setTilt(REST);
    const onChange = () => {
      reduced = media.matches;
      if (reduced) rest();
    };
    const move = (event: PointerEvent) => {
      if (reduced) return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Math.max(-2, Math.min(16, REST.x + py * -14)),
        y: Math.max(-38, Math.min(-8, REST.y + px * 20)),
      });
    };

    media.addEventListener("change", onChange);
    parent.addEventListener("pointermove", move);
    parent.addEventListener("pointerleave", rest);
    return () => {
      media.removeEventListener("change", onChange);
      parent.removeEventListener("pointermove", move);
      parent.removeEventListener("pointerleave", rest);
    };
  }, []);

  const turned = open || reading;
  const style = { "--book-rx": `${tilt.x}deg`, "--book-ry": `${tilt.y}deg` } as CSSProperties;

  return (
    <div ref={stageRef} className="book-stage" style={style} aria-hidden>
      <div className={`book${turned ? " is-open" : ""}${reading ? " is-reading" : ""}`}>
        <div className="book-spine" />
        {LEAVES.map((leaf) => (
          <div key={leaf} className={`book-leaf ${leaf}`}>
            <div className="leaf-sheet">
              <span />
              <span />
              <span />
              <span />
            </div>
          </div>
        ))}
        <div className="book-cover">
          <div className="cover-face">
            <span className="cover-seal">P</span>
            <span className="cover-title">Paperly</span>
            <span className="cover-rule" />
            <span className="cover-sub">Read less. Think more.</span>
          </div>
          <div className="cover-inside" />
        </div>
      </div>
    </div>
  );
}
