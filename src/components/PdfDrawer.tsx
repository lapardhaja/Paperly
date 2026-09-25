"use client";

import dynamic from "next/dynamic";
import { useCallback, useState, type PointerEvent as ReactPointerEvent } from "react";

const PdfCanvas = dynamic(
  () => import("@/components/PdfCanvas").then((mod) => mod.PdfCanvas),
  { ssr: false },
);

function clampZoom(value: number): number {
  const stepped = Math.round(value * 4) / 4;
  return Math.min(2.5, Math.max(0.75, stepped));
}

export function PdfDrawer({
  paperId,
  pageCount,
  page,
  quote,
  width,
  onResize,
  onPage,
  onClose,
}: {
  paperId: string;
  pageCount: number;
  page: number;
  quote: string;
  width: number;
  onResize: (width: number) => void;
  onPage: (page: number) => void;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [located, setLocated] = useState<{ quote: string; found: boolean } | null>(null);
  const fail = useCallback(() => setFailed(true), []);
  const reportQuote = useCallback((found: boolean) => {
    setLocated((current) => {
      if (current?.quote === quote && current.found === found) return current;
      return { quote, found };
    });
  }, [quote]);
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const url = `/api/papers/${paperId}/pdf`;
  const quoteState = quote && located?.quote === quote ? located : null;

  function startResize(event: ReactPointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startW = width;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const move = (ev: PointerEvent) => {
      const next = startW + (startX - ev.clientX);
      const max = Math.min(window.innerWidth - 280, 1200);
      onResize(Math.round(Math.min(max, Math.max(560, next))));
    };
    const up = (ev: PointerEvent) => {
      if (target.hasPointerCapture(ev.pointerId)) target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", up);
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", up);
  }

  return (
    <aside className="fixed inset-0 z-30 flex flex-col bg-surface sm:inset-y-0 sm:left-auto sm:w-[var(--drawer-w)] sm:border-l sm:border-line">
      <button
        type="button"
        aria-label="Resize paper viewer"
        onPointerDown={startResize}
        className="absolute top-0 left-0 z-10 hidden h-full w-1.5 cursor-col-resize sm:block"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(safePage - 1)}
            disabled={safePage <= 1}
            className="h-8 cursor-pointer rounded-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-sm text-muted">
            {safePage} / {pageCount}
          </p>
          <button
            type="button"
            onClick={() => onPage(safePage + 1)}
            disabled={safePage >= pageCount}
            className="h-8 cursor-pointer rounded-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((current) => clampZoom(current - 0.25))}
            className="h-8 w-8 cursor-pointer rounded-full text-sm"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => setZoom(1)}
            title="Fit width"
            className="h-8 cursor-pointer rounded-full px-2 text-sm text-muted"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setZoom((current) => clampZoom(current + 0.25))}
            className="h-8 w-8 cursor-pointer rounded-full text-sm"
            aria-label="Zoom in"
          >
            +
          </button>
          <button type="button" onClick={onClose} className="cursor-pointer text-sm text-muted">
            Close
          </button>
        </div>
      </div>
      {quoteState ? (
        <p className="border-b border-line px-4 py-2 text-xs text-muted">
          {quoteState.found
            ? "Highlighted in the paper."
            : "Opened this page. That wording is not in the PDF text layer."}
        </p>
      ) : null}
      {failed ? (
        <iframe title="Paper PDF" src={`${url}#page=${safePage}`} className="h-full w-full flex-1" />
      ) : (
        <PdfCanvas
          url={url}
          pageNumber={safePage}
          zoom={zoom}
          quote={quote}
          onError={fail}
          onQuoteLocated={reportQuote}
        />
      )}
    </aside>
  );
}
