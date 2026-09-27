"use client";

import { useRef, useState } from "react";

import { DocumentScene } from "@/components/DocumentScene";

export function UploadDropzone({
  disabled,
  onFile,
  onReject,
}: {
  disabled: boolean;
  onFile: (file: File) => void;
  onReject: (message: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const depth = useRef(0);
  const [active, setActive] = useState(false);

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        depth.current += 1;
        setActive(true);
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
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setActive(false);
        const { files } = event.dataTransfer;
        if (files.length > 1) {
          onReject("Upload one PDF at a time.");
          return;
        }
        const file = files[0];
        if (file) onFile(file);
      }}
      className={`stage-drop ${active ? "is-active" : ""}`}
    >
      <DocumentScene open={active} />
      <div className="stage-copy">
        <p className="kicker text-accent">READ LESS. THINK MORE.</p>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight text-balance text-ink sm:text-7xl">
          AI PDF summarizer
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          Turn a paper, scan, or handwritten PDF into a structured summary. Every claim keeps its page.
        </p>
        <p className="mt-8 text-3xl font-semibold tracking-tight text-ink">
          {active ? "Drop to summarize" : "Drag a PDF here"}
        </p>
        <p className="mt-2 text-sm text-muted">Papers, scans, and handwritten notes. Up to 50 MB.</p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="btn-primary mt-6 h-12 px-6 text-[15px]"
        >
          Select a file
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFile(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}
