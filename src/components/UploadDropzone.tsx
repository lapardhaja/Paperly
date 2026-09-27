"use client";

import { useEffect, useRef, useState } from "react";

import { DocumentScene, type BookIntent } from "@/components/DocumentScene";
import { Waiting } from "@/components/Waiting";

const READ_STEPS = [
  "Taking in the document",
  "Reading each page",
  "Checking scans and handwriting",
  "Opening the summary",
] as const;

export function UploadDropzone({
  busy,
  status,
  detail,
  error,
  onFile,
  onPaste,
  onReject,
}: {
  busy: boolean;
  status: string | null;
  detail: string | null;
  error: string | null;
  onFile: (file: File) => void;
  onPaste: (text: string) => void;
  onReject: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const depth = useRef(0);
  const dragged = useRef(false);
  const [active, setActive] = useState(false);
  const [paste, setPaste] = useState(false);
  const [text, setText] = useState("");

  useEffect(() => {
    if (paste) areaRef.current?.focus();
  }, [paste]);

  useEffect(() => {
    if (!paste) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPaste(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paste]);

  const intent: BookIntent = busy ? "reading" : active ? "open" : paste ? "paste" : "rest";
  const trimmed = text.trim();
  const words = trimmed.length === 0 ? 0 : trimmed.split(/\s+/).length;

  function takeFiles(files: FileList | null | undefined) {
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      onReject("Upload one PDF at a time.");
      return;
    }
    const file = files[0];
    if (file) onFile(file);
  }

  function openPaste() {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    setPaste(true);
  }

  const scene = (
    <DocumentScene
      intent={intent}
      page={
        paste ? (
          <form
            className="page-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (trimmed.length > 0) onPaste(text);
            }}
          >
            <textarea
              ref={areaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the document on this page"
              aria-label="Document text"
            />
            <div className="page-form-bar">
              <p className="text-sm font-semibold text-ink">
                {words === 0 ? "The whole document" : `${words.toLocaleString()} words`}
              </p>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setPaste(false)} className="inline-flex h-11 cursor-pointer items-center px-2 text-sm font-semibold text-ink">
                  Close
                </button>
                <button type="submit" disabled={busy || trimmed.length === 0} className="btn-primary h-11 px-4 text-sm">
                  Analyze
                </button>
              </div>
            </div>
          </form>
        ) : null
      }
    />
  );
  const well = active ? (
    <div className="drop-well">
      <span className="drop-well-kicker">Into the book</span>
      <span className="drop-well-title">Release the PDF</span>
    </div>
  ) : null;

  return (
    <div
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--spot-x", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--spot-y", `${event.clientY - rect.top}px`);
      }}
      onDragEnter={(event) => {
        event.preventDefault();
        dragged.current = true;
        depth.current += 1;
        setActive(true);
        setPaste(false);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        depth.current -= 1;
        if (depth.current <= 0) {
          depth.current = 0;
          setActive(false);
          window.setTimeout(() => {
            dragged.current = false;
          }, 400);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        takeFiles(event.dataTransfer.files);
      }}
      onPaste={(event) => {
        if ((event.target as HTMLElement).closest("textarea")) return;
        const file = event.clipboardData.files?.[0];
        if (file) {
          event.preventDefault();
          onFile(file);
          return;
        }
        const pasted = event.clipboardData.getData("text");
        if (pasted.trim().length > 0) {
          event.preventDefault();
          setText(pasted);
          setPaste(true);
        }
      }}
      className={`stage-drop ${active ? "is-active" : ""} ${paste ? "is-paste" : ""}`}
    >
      <div className={`book-column ${paste || busy ? "is-editing" : ""}`}>
        {scene}
        {well}
        {paste || busy ? null : (
          <button
            type="button"
            className="book-hit"
            onClick={openPaste}
            aria-label="Closed Paperly book. Click to paste inside it, or drop a PDF on it."
          />
        )}
      </div>
      <div className="stage-copy">
        <p className="kicker text-accent sm:hidden">READ LESS. THINK MORE.</p>
        <h1 className="mt-3 text-[clamp(2.4rem,4.8vw,4.6rem)] leading-[1.02] font-semibold tracking-tight text-balance text-ink">
          <span className="font-serif">{busy ? "Scanning the pages" : active ? "Release it into the book" : paste ? "Paste it in the book" : "Drop it in the book"}</span>
        </h1>
        {busy ? (
          <div className="mt-5 max-w-md">
            <Waiting compact title={status ?? "Scanning the PDF"} detail={detail ?? undefined} steps={READ_STEPS} />
          </div>
        ) : (
          <p className="mt-4 max-w-md text-base leading-7 text-muted sm:text-lg">
            {paste
              ? "The page is open. Paste as much of the document as you have, then analyze."
              : "The book stays closed until a document goes in. Drop a PDF on the cover, or open it to paste."}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="btn-primary h-12 px-6 text-[15px]"
          >
            Select a file
          </button>
          {!paste ? (
            <button type="button" onClick={() => setPaste(true)} className="inline-flex h-11 cursor-pointer items-center px-3 text-sm font-semibold text-ink">
              Paste instead
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-muted">One PDF, up to 50 MB. Papers, scans, handwriting.</p>
        {error ? <p className="banner-warn mt-4 px-4 py-3" role="alert">{error}</p> : null}
        <p className="mt-4 max-w-md text-base leading-6 text-muted">
          The file stays on this computer. Summaries send the document text to Google Gemini.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        aria-label="PDF file"
        className="sr-only"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
