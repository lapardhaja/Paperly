"use client";

import { CitationList } from "@/components/CitationList";
import { SkeletonBlock, Waiting } from "@/components/Waiting";
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
    return (
      <div>
        <Waiting
          title="Reading this document"
          steps={["Extracting the structure", "Pulling findings and numbers", "Checking page citations"]}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
              <div className="skeleton mb-3 h-3 w-24 rounded-full" />
              <SkeletonBlock lines={3} />
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (!artifact) return null;

  return (
    <div>
      <p className="kicker text-accent">
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
            className="lift rounded-2xl border border-line bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)]"
          >
            <h2 className="kicker text-accent">{insightLabel(card.key)}</h2>
            <p className="mt-2 text-[15px] leading-7 font-medium text-ink">{card.body}</p>
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
