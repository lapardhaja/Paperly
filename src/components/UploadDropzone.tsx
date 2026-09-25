"use client";

import { useRef, useState } from "react";

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
  const [active, setActive] = useState(false);

  return (
    <div
      onDragEnter={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setActive(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setActive(false);
        const { files } = event.dataTransfer;
        if (files.length > 1) {
          onReject("Upload one PDF at a time.");
          return;
        }
        const file = files[0];
        if (file) onFile(file);
      }}
      className={`drop-target flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center ${
        active ? "is-active" : ""
      }`}
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-accent text-gold shadow-[0_10px_24px_rgba(21,40,71,0.22)]">
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" aria-hidden>
          <path
            d="M7 3.5h7.1L19 8.3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5A1.5 1.5 0 0 1 7.5 3.5H7Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <path d="M14 3.7V8.4h4.6" stroke="currentColor" strokeWidth="1.7" />
          <path d="M12 11.2v6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path d="M9.4 13.6 12 11.1l2.6 2.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <p className="mt-5 font-serif text-2xl tracking-tight text-ink">
        {active ? "Drop to summarize" : "Drag and drop a PDF"}
      </p>
      <p className="mt-2 max-w-sm text-sm font-medium text-ink">
        Papers, scans, and handwritten notes. Up to 50 MB.
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="btn-primary mt-6 h-12 px-6 text-[15px]"
      >
        Select a file
      </button>
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
