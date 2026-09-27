"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrandLockup } from "@/components/BrandMark";
import { UploadDropzone } from "@/components/UploadDropzone";

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
    setStatus("Scanning the PDF…");
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
    setStatus("Analyzing the text…");
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
      <UploadDropzone
        busy={busy}
        status={status}
        detail={fileLabel}
        error={error}
        onFile={(file) => void upload(file)}
        onPaste={(text) => void paste(text)}
        onReject={setError}
      />
    </div>
  );
}
