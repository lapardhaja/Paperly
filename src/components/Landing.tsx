"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PastePanel } from "@/components/PastePanel";
import { UploadDropzone } from "@/components/UploadDropzone";

export function Landing() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = status !== null;

  async function upload(file: File) {
    if (busy) return;
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("That file is not a PDF. Paste the text instead.");
      return;
    }
    setError(null);
    setStatus("Reading the paper…");
    const body = new FormData();
    body.set("file", file);
    const response = await fetch("/api/papers", { method: "POST", body });
    const data = (await response.json()) as { paper?: { id: string }; error?: string };
    if (!response.ok || !data.paper) {
      setStatus(null);
      setError(data.error ?? "Could not read that paper.");
      return;
    }
    router.push(`/p/${data.paper.id}`);
  }

  async function paste(text: string) {
    if (busy) return;
    setError(null);
    setStatus("Reading the paper…");
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
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col justify-center px-6 py-16">
      <p className="font-serif text-5xl tracking-tight text-ink sm:text-6xl">Paperly</p>
      <p className="mt-3 font-serif text-xl text-muted italic">Understand research papers faster.</p>
      <div className="mt-10">
        <UploadDropzone
          disabled={busy}
          onFile={(file) => void upload(file)}
          onReject={setError}
        />
      </div>
      <div className="mt-5">
        <PastePanel disabled={busy} onPaste={(text) => void paste(text)} />
      </div>
      {status ? <p className="mt-6 text-sm text-muted">{status}</p> : null}
      {error ? <p className="mt-4 text-sm text-warn">{error}</p> : null}
      <p className="mt-8 text-xs leading-5 text-muted">
        The file stays on this computer. When you ask a question, the paper text is sent to Google
        Gemini.
      </p>
    </main>
  );
}
