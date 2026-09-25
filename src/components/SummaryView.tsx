"use client";

import { AnswerBlock } from "@/components/AnswerBlock";
import { summaryKind, summaryLabel } from "@/lib/format";
import type { ArtifactMap, PaperSource, SummaryArtifact, SummaryMode } from "@/lib/types";

const MODES: SummaryMode[] = ["quick", "detailed", "executive", "eli5"];

const BLURBS: Record<SummaryMode, string> = {
  quick: "A short explanation in plain language.",
  detailed: "Question, motivation, method, data, results, conclusions.",
  executive: "The version you can brief someone with.",
  eli5: "No assumed background.",
};

export function SummaryView({
  artifacts,
  mode,
  source,
  loading,
  onMode,
  onOpenPage,
}: {
  artifacts: ArtifactMap;
  mode: SummaryMode | null;
  source: PaperSource;
  loading: boolean;
  onMode: (mode: SummaryMode) => void;
  onOpenPage: (page: number) => void;
}) {
  const artifact = mode ? artifacts[summaryKind(mode)] : undefined;
  const summary = artifact && artifact.kind !== "insights" && artifact.kind !== "analysis"
    ? (artifact as SummaryArtifact)
    : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onMode(item)}
            className={`h-9 cursor-pointer rounded-full px-3 text-sm ${
              item === mode ? "bg-accent text-white" : "bg-surface text-ink ring-1 ring-line"
            }`}
          >
            {summaryLabel(item)}
          </button>
        ))}
      </div>
      {!mode ? (
        <p className="mt-8 text-sm text-muted">Pick a way to read this paper.</p>
      ) : loading && !summary ? (
        <p className="mt-8 text-sm text-muted">Writing the {summaryLabel(mode).toLowerCase()} summary…</p>
      ) : summary ? (
        <div className="mt-8">
          <p className="mb-4 text-sm text-muted">{BLURBS[mode]}</p>
          <AnswerBlock answer={summary.answer} source={source} onOpenPage={onOpenPage} />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{BLURBS[mode]}</p>
      )}
    </div>
  );
}
