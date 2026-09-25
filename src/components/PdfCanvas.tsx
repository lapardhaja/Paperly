"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from "pdfjs-dist";

import { quoteRunIndexes, type TextRun } from "@/lib/citations";

GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

type ViewportPoint = {
  width: number;
  height: number;
  convertToViewportPoint(x: number, y: number): number[];
};

type PdfRun = TextRun & {
  width: number;
  height: number;
  transform: number[];
};

function readRuns(items: unknown[]): PdfRun[] {
  return items.flatMap((item) => {
    if (typeof item !== "object" || item === null || !("str" in item)) return [];
    const record = item as {
      str?: unknown;
      hasEOL?: unknown;
      width?: unknown;
      height?: unknown;
      transform?: unknown;
    };
    if (typeof record.str !== "string" || !Array.isArray(record.transform)) return [];
    return [
      {
        str: record.str,
        hasEOL: record.hasEOL === true,
        width: typeof record.width === "number" ? record.width : 0,
        height: typeof record.height === "number" ? record.height : 0,
        transform: record.transform.map((value) => (typeof value === "number" ? value : Number(value) || 0)),
      },
    ];
  });
}

function textBox(run: PdfRun, viewport: ViewportPoint) {
  const transform = run.transform;
  const x = transform[4] ?? 0;
  const y = transform[5] ?? 0;
  const fontHeight = Math.hypot(transform[2] ?? 0, transform[3] ?? 0) || run.height || 10;
  const [x1, y1] = viewport.convertToViewportPoint(x, y).map((value) => Number(value));
  const [x2, y2] = viewport.convertToViewportPoint(x + run.width, y + fontHeight).map((value) => Number(value));
  return {
    left: Math.min(x1 ?? 0, x2 ?? 0),
    top: Math.min(y1 ?? 0, y2 ?? 0),
    width: Math.abs((x2 ?? 0) - (x1 ?? 0)),
    height: Math.max(Math.abs((y2 ?? 0) - (y1 ?? 0)), 8),
  };
}

function paintHighlight(canvas: HTMLCanvasElement, viewport: ViewportPoint, runs: PdfRun[], quote: string): boolean {
  const context = canvas.getContext("2d");
  if (!context) return false;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, viewport.width, viewport.height);
  const quoteText = quote.trim();
  if (!quoteText) return false;
  const indexes = new Set(quoteRunIndexes(runs, quoteText));
  if (indexes.size === 0) return false;
  context.fillStyle = "rgba(250, 204, 21, 0.48)";
  for (const index of indexes) {
    const run = runs[index];
    if (!run) continue;
    const box = textBox(run, viewport);
    context.fillRect(box.left - 1, box.top - 1, box.width + 2, box.height + 2);
  }
  return true;
}

export function PdfCanvas({
  url,
  pageNumber,
  zoom,
  quote,
  onError,
  onQuoteLocated,
}: {
  url: string;
  pageNumber: number;
  zoom: number;
  quote: string;
  onError: (message: string) => void;
  onQuoteLocated: (found: boolean) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const highlightRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const viewportRef = useRef<ViewportPoint | null>(null);
  const runsRef = useRef<PdfRun[]>([]);
  const paintedRef = useRef<{ pageNumber: number; zoom: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [renderGen, setRenderGen] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const task = getDocument({ url });
    taskRef.current = task;

    void (async () => {
      try {
        const doc = await task.promise;
        if (cancelled) return;
        docRef.current = doc;
        setReady(true);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not open the PDF.";
        onError(
          message.toLowerCase().includes("password")
            ? "This PDF is password-protected."
            : "Could not render this PDF.",
        );
      }
    })();

    return () => {
      cancelled = true;
      docRef.current = null;
      const taskToClose = taskRef.current;
      taskRef.current = null;
      void taskToClose?.destroy();
    };
  }, [url, onError]);

  useEffect(() => {
    const doc = docRef.current;
    const frame = frameRef.current;
    const canvas = canvasRef.current;
    const highlight = highlightRef.current;
    if (!doc || !frame || !canvas || !highlight || !ready) return;

    let cancelled = false;
    let generation = 0;
    let lastWidth = -1;
    let timer = 0;
    let cancelRender: (() => void) | undefined;

    const render = async (width: number) => {
      if (width < 40 || Math.abs(width - lastWidth) < 1) return;
      lastWidth = width;
      const gen = ++generation;
      cancelRender?.();
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled || gen !== generation) return;
        const cssWidth = Math.max(width, 280) * zoom;
        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: cssWidth / unscaled.width });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        highlight.width = canvas.width;
        highlight.height = canvas.height;
        highlight.style.width = canvas.style.width;
        highlight.style.height = canvas.style.height;
        const renderTask = page.render({
          canvas,
          viewport,
          transform: dpr === 1 ? undefined : [dpr, 0, 0, dpr, 0, 0],
        });
        const rendered = renderTask.promise.then(
          () => ({ ok: true as const }),
          (error: unknown) => ({ ok: false as const, error }),
        );
        cancelRender = () => renderTask.cancel();
        const content = await page.getTextContent();
        const result = await rendered;
        if (!result.ok) throw result.error;
        if (cancelled || gen !== generation) return;
        viewportRef.current = viewport;
        runsRef.current = readRuns(content.items);
        paintedRef.current = { pageNumber, zoom };
        setRenderGen((current) => current + 1);
      } catch (error) {
        if (cancelled || gen !== generation) return;
        const name = error instanceof Error ? error.name : "";
        if (name === "RenderingCancelledException") return;
        onError("Could not render this page.");
      }
    };

    const schedule = (width: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void render(width), 40);
    };
    const observer = new ResizeObserver((entries) => {
      schedule(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(frame);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      cancelRender?.();
      observer.disconnect();
    };
  }, [onError, pageNumber, ready, zoom]);

  useEffect(() => {
    const canvas = highlightRef.current;
    const viewport = viewportRef.current;
    const painted = paintedRef.current;
    if (!canvas || !viewport || !painted || painted.pageNumber !== pageNumber || painted.zoom !== zoom) return;
    const found = paintHighlight(canvas, viewport, runsRef.current, quote);
    if (quote.trim()) onQuoteLocated(found);
  }, [onQuoteLocated, pageNumber, quote, renderGen, zoom]);

  return (
    <div ref={frameRef} className="min-h-0 flex-1 overflow-auto bg-paper p-4">
      {ready ? null : <p className="text-sm text-muted">Opening the PDF…</p>}
      <div className={ready ? "relative mx-auto w-fit" : "hidden"}>
        <canvas ref={canvasRef} className="block bg-white shadow-sm" />
        <canvas ref={highlightRef} className="pointer-events-none absolute top-0 left-0" />
      </div>
    </div>
  );
}
