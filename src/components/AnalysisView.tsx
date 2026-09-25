"use client";

import { CitationList } from "@/components/CitationList";
import { Waiting } from "@/components/Waiting";
import { coverageLine } from "@/lib/format";
import type { AnalysisArtifact, AnalysisItem, OpenPage, PaperSource } from "@/lib/types";

function ItemList({
  items,
  source,
  activeQuote,
  onOpenPage,
  onPreviewPage,
  empty,
}: {
  items: AnalysisItem[];
  source: PaperSource;
  activeQuote?: string;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li
          key={`${index}-${item.text.slice(0, 24)}`}
          data-paper-source
          onMouseEnter={() => {
            const first = item.citations[0];
            if (first && source === "pdf") onPreviewPage(first.page, first.quote);
          }}
        >
          <p className="text-[15px] leading-7 font-medium">{item.text}</p>
          <CitationList
            citations={item.citations}
            source={source}
            activeQuote={activeQuote}
            onOpenPage={onOpenPage}
            onPreviewPage={onPreviewPage}
          />
        </li>
      ))}
    </ul>
  );
}

export function AnalysisView({
  artifact,
  source,
  loading,
  activeQuote,
  onGenerate,
  onOpenPage,
  onPreviewPage,
}: {
  artifact: AnalysisArtifact | null;
  source: PaperSource;
  loading: boolean;
  activeQuote?: string;
  onGenerate: () => void;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  if (!artifact) {
    return (
      <div>
        <p className="max-w-xl text-sm leading-6 font-medium text-ink">
          Strengths from the document, limitations the authors state, and a separate read of what
          Paperly thinks is weak.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="btn-primary mt-6 h-11 px-5 text-sm"
        >
          {loading ? "Reading the document…" : "Analyze strengths and weaknesses"}
        </button>
        {loading ? (
          <div className="mt-6">
            <Waiting
              title="Appraising the document"
              steps={["Finding stated strengths", "Quoting the authors' limits", "Separating Paperly's judgment"]}
            />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <p className="kicker text-accent">
        {coverageLine(artifact.coverage, artifact.truncated, artifact.pagesUsed)}
      </p>
      <section>
        <h2 className="font-serif text-2xl tracking-tight">Strengths</h2>
        <p className="mt-1 text-sm font-medium text-ink">Tied to evidence in the document.</p>
        <div className="mt-4">
          <ItemList
            items={artifact.strengths}
            source={source}
            activeQuote={activeQuote}
            onOpenPage={onOpenPage}
            onPreviewPage={onPreviewPage}
            empty="No strength could be tied to a quote in the paper."
          />
        </div>
      </section>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="font-serif text-2xl tracking-tight">Authors&apos; stated limitations</h2>
          <p className="mt-1 text-sm font-medium text-ink">Limitations the authors wrote down.</p>
          <div className="mt-4">
            <ItemList
              items={artifact.authorLimitations}
              source={source}
              activeQuote={activeQuote}
              onOpenPage={onOpenPage}
              onPreviewPage={onPreviewPage}
              empty="The authors do not state limitations that Paperly could quote."
            />
          </div>
        </section>
        <section>
          <h2 className="font-serif text-2xl tracking-tight">Paperly&apos;s analysis</h2>
          <p className="mt-1 text-sm font-semibold text-warn">Judgments, not statements from the document.</p>
          <div className="mt-4">
            <ItemList
              items={artifact.paperlyAnalysis}
              source={source}
              activeQuote={activeQuote}
              onOpenPage={onOpenPage}
              onPreviewPage={onPreviewPage}
              empty="No additional weakness was grounded in the paper."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
