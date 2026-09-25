"use client";

import { CitationList } from "@/components/CitationList";
import { coverageLine } from "@/lib/format";
import type { AnalysisArtifact, AnalysisItem, PaperSource } from "@/lib/types";

function ItemList({
  items,
  source,
  onOpenPage,
  empty,
}: {
  items: AnalysisItem[];
  source: PaperSource;
  onOpenPage: (page: number) => void;
  empty: string;
}) {
  if (items.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item, index) => (
        <li key={`${index}-${item.text.slice(0, 24)}`}>
          <p className="text-[15px] leading-7">{item.text}</p>
          <CitationList citations={item.citations} source={source} onOpenPage={onOpenPage} />
        </li>
      ))}
    </ul>
  );
}

export function AnalysisView({
  artifact,
  source,
  loading,
  onGenerate,
  onOpenPage,
}: {
  artifact: AnalysisArtifact | null;
  source: PaperSource;
  loading: boolean;
  onGenerate: () => void;
  onOpenPage: (page: number) => void;
}) {
  if (!artifact) {
    return (
      <div>
        <p className="max-w-xl text-sm leading-6 text-muted">
          Strengths from the paper, limitations the authors state, and a separate read of what
          Paperly thinks is weak.
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={onGenerate}
          className="mt-6 h-11 cursor-pointer rounded-full bg-accent px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Reading the paper…" : "Analyze strengths and weaknesses"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <p className="text-xs tracking-wide text-muted uppercase">
        {coverageLine(artifact.coverage, artifact.truncated, artifact.pagesUsed)}
      </p>
      <section>
        <h2 className="font-serif text-2xl">Strengths</h2>
        <p className="mt-1 text-sm text-muted">Tied to evidence in the paper.</p>
        <div className="mt-4">
          <ItemList
            items={artifact.strengths}
            source={source}
            onOpenPage={onOpenPage}
            empty="No strength could be tied to a quote in the paper."
          />
        </div>
      </section>
      <div className="grid gap-8 md:grid-cols-2">
        <section>
          <h2 className="font-serif text-2xl">Authors&apos; stated limitations</h2>
          <p className="mt-1 text-sm text-muted">Limitations the authors wrote down.</p>
          <div className="mt-4">
            <ItemList
              items={artifact.authorLimitations}
              source={source}
              onOpenPage={onOpenPage}
              empty="The authors do not state limitations that Paperly could quote."
            />
          </div>
        </section>
        <section>
          <h2 className="font-serif text-2xl">Paperly&apos;s analysis</h2>
          <p className="mt-1 text-sm text-warn">Judgments, not statements from the paper.</p>
          <div className="mt-4">
            <ItemList
              items={artifact.paperlyAnalysis}
              source={source}
              onOpenPage={onOpenPage}
              empty="No additional weakness was grounded in the paper."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
