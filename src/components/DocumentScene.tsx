"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

const REST = { x: 14, y: -28 };
const OPEN = { x: 8, y: -16 };

const LEAVES = ["leaf-1", "leaf-2", "leaf-3", "leaf-4"] as const;

export type BookIntent = "rest" | "open" | "paste" | "reading";

export function DocumentScene({ intent = "rest", page }: { intent?: BookIntent; page?: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef(intent);
  const [tilt, setTilt] = useState(REST);
  const posedTilt = intent === "rest" ? tilt : OPEN;

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    const parent = stageRef.current?.parentElement?.closest(".stage-drop");
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
      if (intentRef.current !== "rest") return;
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({
        x: Math.max(4, Math.min(28, REST.x + py * -16)),
        y: Math.max(-48, Math.min(-18, REST.y + px * 18)),
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

  const posed = intent === "rest" ? "" : ` is-${intent}`;
  const style = { "--book-rx": `${posedTilt.x}deg`, "--book-ry": `${posedTilt.y}deg` } as CSSProperties;

  return (
    <div ref={stageRef} className="book-stage" style={style} aria-hidden={page ? undefined : true}>
      <div className={`book${posed}`}>
        <div className="book-shadow" />
        <div className="book-spine" />
        <div className="page-block" />
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
        {page ? <div className="page-write">{page}</div> : null}
        <div className="scan-plane" />
        <div className="book-cover">
          <div className="cover-face">
            <span className="cover-seal">P</span>
            <span className="cover-title">Paperly</span>
            <span className="cover-rule" />
            <span className="cover-sub">Read less. Think more.</span>
          </div>
          <div className="cover-inside">
            <span className="cover-seal">P</span>
            <span className="cover-title">Paperly</span>
            <span className="cover-rule" />
            <span className="cover-sub">Read less. Think more.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
