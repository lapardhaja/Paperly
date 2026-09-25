"use client";

import { CitationList } from "@/components/CitationList";
import { coverageLine, insightLabel } from "@/lib/format";
import type { InsightsArtifact, OpenPage, PaperSource } from "@/lib/types";

export function InsightsGrid({
  artifact,
  source,
  loading,
  activeQuote,
  onOpenPage,
  onPreviewPage,
}: {
  artifact: InsightsArtifact | null;
  source: PaperSource;
  loading: boolean;
  activeQuote?: string;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  if (loading && !artifact) {
    return <p className="text-sm text-muted">Reading this paper…</p>;
  }
  if (!artifact) return null;

  return (
    <div>
      <p className="text-xs tracking-wide text-muted uppercase">
        {coverageLine(artifact.coverage, artifact.truncated, artifact.pagesUsed)}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {artifact.cards.map((card) => (
          <article
            key={card.key}
            data-paper-source
            onMouseEnter={() => {
              const first = card.citations[0];
              if (first && source === "pdf") onPreviewPage(first.page, first.quote);
            }}
            className="rounded-2xl border border-line bg-surface px-4 py-4"
          >
            <h2 className="text-xs tracking-wide text-muted uppercase">{insightLabel(card.key)}</h2>
            <p className="mt-2 text-[15px] leading-7 text-ink">{card.body}</p>
            <CitationList
              citations={card.citations}
              source={source}
              activeQuote={activeQuote}
              onOpenPage={onOpenPage}
              onPreviewPage={onPreviewPage}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
