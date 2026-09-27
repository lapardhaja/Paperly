"use client";

import { useEffect, useRef, useState } from "react";

import { DocumentScene, type BookIntent } from "@/components/DocumentScene";

const MIN_PASTE = 80;

export function UploadDropzone({
  disabled,
  error,
  onFile,
  onPaste,
  onReject,
}: {
  disabled: boolean;
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
  const [near, setNear] = useState(false);
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

  const intent: BookIntent = active ? "open" : paste ? "paste" : near ? "near" : "rest";
  const ready = text.trim().length >= MIN_PASTE;

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

  const scene = <DocumentScene intent={intent} />;
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
      {paste ? (
        <div className="book-column is-editing">
          {scene}
          <form
            className="paste-sheet"
            onSubmit={(event) => {
              event.preventDefault();
              if (ready) onPaste(text);
            }}
          >
            <p className="text-xs font-bold tracking-[0.16em] text-ink uppercase">On the page</p>
            <textarea
              ref={areaRef}
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste the document here"
              aria-label="Document text"
              className="w-full flex-1 resize-none bg-transparent text-sm leading-6 text-ink outline-none placeholder:text-muted"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-ink">
                <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${ready ? "bg-mint" : "bg-line"}`} />
                {ready ? "Ready to read" : `${text.trim().length}/80`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPaste(false)}
                  className="cursor-pointer text-sm font-semibold text-ink"
                >
                  Close
                </button>
                <button type="submit" disabled={disabled || !ready} className="btn-primary h-10 px-4 text-sm">
                  Read this
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        <button
          type="button"
          className="book-column"
          onClick={openPaste}
          onPointerEnter={() => setNear(true)}
          onPointerLeave={() => setNear(false)}
          aria-label="Open the book and paste text. You can also drop a PDF on it."
        >
          {scene}
          {well}
        </button>
      )}
      <div className="stage-copy">
        <p className="kicker text-accent sm:hidden">READ LESS. THINK MORE.</p>
        <h1 className="mt-3 text-[clamp(2.4rem,4.8vw,4.6rem)] leading-[1.02] font-semibold tracking-tight text-balance text-ink">
          {active ? "Release it into the book" : paste ? "Paste onto the page" : "Drop it in the book"}
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-muted sm:text-lg">
          {paste
            ? "The page is open. Paste a paper, notes, or a scan transcript."
            : "Drag a PDF onto the book. Or click it and paste the text onto the open page."}
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="btn-primary h-12 px-6 text-[15px]"
          >
            Select a file
          </button>
          {!paste ? (
            <button type="button" onClick={() => setPaste(true)} className="cursor-pointer text-sm font-semibold text-ink">
              Paste instead
            </button>
          ) : null}
        </div>
        <p className="mt-3 text-sm text-muted">One PDF, up to 50 MB. Papers, scans, handwriting.</p>
        {error ? <p className="banner-warn mt-4 px-4 py-3">{error}</p> : null}
        <p className="mt-4 max-w-md text-xs leading-5 text-muted">
          The file stays on this computer. Summaries send the document text to Google Gemini.
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          takeFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}
