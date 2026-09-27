"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrandLockup } from "@/components/BrandMark";
import { DocumentScene } from "@/components/DocumentScene";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Waiting } from "@/components/Waiting";

const READ_STEPS = [
  "Taking in the document",
  "Reading each page",
  "Checking scans and handwriting",
  "Opening the summary",
] as const;

export function Landing() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== null;

  async function upload(file: File) {
    if (busy) return;
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("That file is not a PDF. Open the book and paste the text.");
      return;
    }
    setError(null);
    setFileLabel(file.name);
    setStatus("Reading the PDF…");
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/papers", { method: "POST", body });
    const data = (await response.json()) as { paper?: { id: string }; error?: string };
    if (!response.ok || !data.paper) {
      setStatus(null);
      setError(data.error ?? "Could not read that PDF.");
      return;
    }
    router.push(`/p/${data.paper.id}`);
  }

  async function paste(text: string) {
    if (busy) return;
    setError(null);
    setFileLabel("Pasted text");
    setStatus("Reading the text…");
    const response = await fetch("/api/papers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = (await response.json()) as { paper?: { id: string }; error?: string };
    if (!response.ok || !data.paper) {
      setStatus(null);
      setError(data.error ?? "Could not read that text.");
      return;
    }
    router.push(`/p/${data.paper.id}`);
  }

  return (
    <div className="landing-stage">
      <header className="absolute inset-x-0 top-0 z-30 flex h-20 items-center justify-between bg-white/75 px-4 backdrop-blur sm:px-8">
        <BrandLockup />
        <p className="kicker hidden text-ink sm:block">READ LESS. THINK MORE.</p>
      </header>
      {busy ? (
        <div className="stage-drop">
          <div className="book-column">
            <DocumentScene intent="reading" />
          </div>
          <div className="stage-copy">
            <p className="kicker text-accent sm:hidden">READ LESS. THINK MORE.</p>
            <h1 className="mt-3 text-[clamp(2.4rem,4.8vw,4.6rem)] leading-[1.02] font-semibold tracking-tight text-ink">
              Reading the document
            </h1>
            <div className="mt-5 max-w-md">
              <Waiting compact title={status ?? "Reading the PDF"} detail={fileLabel ?? undefined} steps={READ_STEPS} />
            </div>
          </div>
        </div>
      ) : (
        <UploadDropzone
          disabled={busy}
          error={error}
          onFile={(file) => void upload(file)}
          onPaste={(text) => void paste(text)}
          onReject={setError}
        />
      )}
    </div>
  );
}
