"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const REST = { x: 8, y: -22 };
const CALM = { x: 5, y: -16 };

const LEAVES = ["leaf-1", "leaf-2", "leaf-3", "leaf-4"] as const;

export type BookIntent = "rest" | "near" | "open" | "paste" | "reading";

export function DocumentScene({ intent = "rest" }: { intent?: BookIntent }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const intentRef = useRef(intent);
  const [tilt, setTilt] = useState(REST);
  const posedTilt = intent === "paste" || intent === "reading" ? CALM : tilt;

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    const parent = stageRef.current?.parentElement?.closest(".stage-drop");
    if (!parent) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = media.matches;

    const rest = () => {
      if (intentRef.current === "paste" || intentRef.current === "reading") setTilt(CALM);
      else setTilt(REST);
    };
    const onChange = () => {
      reduced = media.matches;
      if (reduced) rest();
    };
    const move = (event: PointerEvent) => {
      if (reduced) return;
      if (intentRef.current === "paste" || intentRef.current === "reading") {
        setTilt(CALM);
        return;
      }
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

  const posed = intent === "rest" ? "" : ` is-${intent}`;
  const style = { "--book-rx": `${posedTilt.x}deg`, "--book-ry": `${posedTilt.y}deg` } as CSSProperties;

  return (
    <div ref={stageRef} className="book-stage" style={style} aria-hidden>
      <div className={`book${posed}`}>
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
