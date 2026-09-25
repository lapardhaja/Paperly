"use client";

import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions, type PDFDocumentLoadingTask, type PDFDocumentProxy } from "pdfjs-dist";

GlobalWorkerOptions.workerSrc = "/api/pdf-worker";

export function PdfCanvas({
  url,
  pageNumber,
  onError,
}: {
  url: string;
  pageNumber: number;
  onError: (message: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const taskRef = useRef<PDFDocumentLoadingTask | null>(null);
  const [ready, setReady] = useState(false);

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
    const canvas = canvasRef.current;
    if (!doc || !canvas || !ready) return;

    let cancelled = false;
    let cancelRender: (() => void) | undefined;

    void (async () => {
      try {
        const page = await doc.getPage(pageNumber);
        if (cancelled) return;
        const width = Math.max((canvas.parentElement?.clientWidth ?? 400) - 32, 240);
        const unscaled = page.getViewport({ scale: 1 });
        const viewport = page.getViewport({ scale: width / unscaled.width });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const renderTask = page.render({ canvas, viewport });
        cancelRender = () => renderTask.cancel();
        await renderTask.promise;
      } catch (error) {
        if (cancelled) return;
        const name = error instanceof Error ? error.name : "";
        if (name === "RenderingCancelledException") return;
        onError("Could not render this page.");
      }
    })();

    return () => {
      cancelled = true;
      cancelRender?.();
    };
  }, [onError, pageNumber, ready]);

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-paper p-4">
      {ready ? null : <p className="text-sm text-muted">Opening the PDF…</p>}
      <canvas ref={canvasRef} className={ready ? "h-auto w-full shadow-sm" : "hidden"} />
    </div>
  );
}
