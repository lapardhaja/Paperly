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
      className={`drop-target flex min-h-80 flex-col items-center justify-center gap-2 px-4 py-8 text-center sm:flex-row sm:gap-8 sm:px-8 sm:text-left ${
        active ? "is-active" : ""
      }`}
    >
      <DocumentScene open={active} />
      <div className="flex max-w-sm flex-col items-center sm:items-start">
        <p className="font-serif text-2xl tracking-tight text-ink">
          {active ? "Drop to summarize" : "Drag and drop a PDF"}
        </p>
        <p className="mt-2 text-sm font-medium text-ink">
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
