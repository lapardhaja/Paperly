"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BrandMark } from "@/components/BrandMark";
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
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-surface/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-serif text-[17px] tracking-tight">Paperly</span>
          </div>
          <p className="kicker text-accent">AI PDF summarizer</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-5 pt-8 pb-20">
        <section className="site-hero rounded-[1.6rem] px-5 py-10 sm:px-10">
          <p className="kicker text-center text-gold">Document intelligence</p>
          <h1 className="mt-3 text-center font-serif text-4xl tracking-tight text-balance text-white sm:text-6xl">
            AI PDF summarizer
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg leading-7 text-[#d5dfec]">
            Turn a paper, scan, or handwritten PDF into a structured summary. Every claim keeps its page.
          </p>
          <div className="site-hero-card mt-8 p-3 sm:p-4">
            {busy ? (
              <Waiting title={status ?? "Reading the PDF"} detail={fileLabel ?? undefined} steps={READ_STEPS} />
            ) : (
              <UploadDropzone disabled={busy} onFile={(file) => void upload(file)} onReject={setError} />
            )}
          </div>
        </section>
        <div className="mt-4 flex justify-center">
          <PastePanel disabled={busy} onPaste={(text) => void paste(text)} />
        </div>
        {error ? <p className="banner-warn mt-4 px-4 py-3">{error}</p> : null}
        <section className="mt-16">
          <p className="kicker text-center text-accent">How it works</p>
          <h2 className="mt-2 text-center font-serif text-3xl tracking-tight">Summarize a PDF in three steps</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="lift hoban-card rounded-2xl p-4">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent font-serif text-sm text-white">
                  {index + 1}
                </span>
                <h3 className="mt-3 font-serif text-lg tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
        <section className="mt-12 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="lift hoban-card rounded-2xl p-5">
              <h3 className="font-serif text-lg tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink">{feature.body}</p>
            </article>
          ))}
        </section>
        <p className="mt-10 text-center text-xs leading-5 font-medium text-muted">
          The file stays on this computer. When you summarize or ask, the document text is sent to Google Gemini.
        </p>
      </main>
    </div>
  );
}
