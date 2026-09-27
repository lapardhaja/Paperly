"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "@/components/BrandMark";
import { DocumentScene } from "@/components/DocumentScene";
import { PastePanel } from "@/components/PastePanel";
import { UploadDropzone } from "@/components/UploadDropzone";
import { Waiting } from "@/components/Waiting";

const STEPS = [
  {
    title: "Drop a PDF",
    body: "One file, up to 50 MB. Native text, scans, and handwritten pages all go in the same box.",
  },
  {
    title: "Paperly reads it",
    body: "Text, tables, equations, and handwriting are digitized before anything is summarized.",
  },
  {
    title: "Get a cited summary",
    body: "Brief, standard, or comprehensive. Every claim ends with the page it came from.",
  },
] as const;

const FEATURES = [
  {
    title: "Page citations",
    body: "Claims, metrics, and quotes stay tied to [Page X]. A quote that is not in the file is dropped.",
  },
  {
    title: "Handwriting",
    body: "Scanned notes and marginalia come back as Markdown and LaTeX, labeled with the page.",
  },
  {
    title: "Tone and length",
    body: "Academic, executive, or plain language. About 250, 650, or 1,400 words.",
  },
  {
    title: "Ask the document",
    body: "Follow-up questions are answered from the file. If it is not in there, Paperly says so.",
  },
] as const;

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
      setError("That file is not a PDF. Paste the text instead.");
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
      <header className="absolute inset-x-0 top-0 z-30 flex h-16 items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-2.5 text-white">
          <BrandMark className="h-9 w-9 bg-[#f5f3ff] text-[#4c1d95]" />
          <span className="font-serif text-lg tracking-tight">Paperly</span>
        </div>
        <p className="kicker text-[#e9d5ff]">AI PDF summarizer</p>
      </header>
      {busy ? (
        <div className="stage-drop">
          <DocumentScene open reading />
          <div className="stage-copy">
            <p className="kicker text-[#e9d5ff]">Document intelligence</p>
            <h1 className="mt-3 font-serif text-5xl tracking-tight text-white sm:text-6xl">Reading the document</h1>
            <div className="mt-6">
              <Waiting title={status ?? "Reading the PDF"} detail={fileLabel ?? undefined} steps={READ_STEPS} />
            </div>
          </div>
        </div>
      ) : (
        <UploadDropzone disabled={busy} onFile={(file) => void upload(file)} onReject={setError} />
      )}
      <section className="stage-lower">
        <div className="mx-auto flex max-w-6xl justify-center">
          <PastePanel
            disabled={busy}
            onPaste={(text) => void paste(text)}
            buttonClassName="cursor-pointer text-sm font-semibold text-[#e9d5ff] underline-offset-4 hover:underline"
          />
        </div>
        {error ? <p className="banner-warn mx-auto mt-4 max-w-6xl px-4 py-3">{error}</p> : null}
        <div className="mx-auto mt-16 max-w-6xl">
          <p className="kicker text-center text-[#e9d5ff]">How it works</p>
          <h2 className="mt-2 text-center font-serif text-4xl tracking-tight text-white">Summarize a PDF in three steps</h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="lift hoban-card rounded-2xl p-5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f5f3ff] font-serif text-sm text-[#3b0764]">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-serif text-xl tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#ddd6fe]">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="lift hoban-card rounded-2xl p-5">
                <h3 className="font-serif text-xl tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#ddd6fe]">{feature.body}</p>
              </article>
            ))}
          </div>
          <p className="mt-10 text-center text-xs leading-5 text-[#c4b5fd]">
            The file stays on this computer. When you summarize or ask, the document text is sent to Google Gemini.
          </p>
        </div>
      </section>
    </div>
  );
}
