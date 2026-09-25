"use client";

import { CitationList } from "@/components/CitationList";
import { coverageLine, insightLabel } from "@/lib/format";
import type { InsightsArtifact, PaperSource } from "@/lib/types";

export function InsightsGrid({
  artifact,
  source,
  loading,
  onOpenPage,
}: {
  artifact: InsightsArtifact | null;
  source: PaperSource;
  loading: boolean;
  onOpenPage: (page: number) => void;
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
          <article key={card.key} className="rounded-2xl border border-line bg-surface px-4 py-4">
            <h2 className="text-xs tracking-wide text-muted uppercase">{insightLabel(card.key)}</h2>
            <p className="mt-2 text-[15px] leading-7 text-ink">{card.body}</p>
            <CitationList citations={card.citations} source={source} onOpenPage={onOpenPage} />
          </article>
        ))}
      </div>
    </div>
  );
}
