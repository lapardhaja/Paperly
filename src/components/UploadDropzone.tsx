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
          onReject("Upload one paper at a time.");
          return;
        }
        const file = files[0];
        if (file) onFile(file);
      }}
      className={`flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed px-8 py-12 text-center transition-colors ${
        active ? "border-accent bg-accent-soft" : "border-line bg-surface"
      }`}
    >
      <p className="font-serif text-3xl text-ink">Drop a paper here</p>
      <p className="mt-2 text-sm text-muted">PDF, up to 50 MB</p>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-6 h-11 cursor-pointer rounded-full bg-accent px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
      >
        Upload PDF
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
