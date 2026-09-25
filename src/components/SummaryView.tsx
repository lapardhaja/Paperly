"use client";

import { useState } from "react";

import { AnswerBlock } from "@/components/AnswerBlock";
import {
  defaultSummaryWords,
  isSummaryArtifact,
  summaryKind,
  summaryLabel,
  toneLabel,
} from "@/lib/format";
import { SUMMARY_TONES, type ArtifactMap, type OpenPage, type PaperSource, type SummaryMode, type SummarySettings, type SummaryTone } from "@/lib/types";

const MODES: SummaryMode[] = ["quick", "detailed", "executive", "eli5"];

const BLURBS: Record<SummaryMode, string> = {
  quick: "A short explanation in plain language.",
  detailed: "Question, motivation, method, data, results, conclusions.",
  executive: "The version you can brief someone with.",
  eli5: "No assumed background.",
};

type Draft = { words: string; tone: SummaryTone };

function parseDraftWords(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const words = Number(value);
  if (words < 50 || words > 2000) return null;
  return words;
}

export function SummaryView({
  artifacts,
  mode,
  source,
  loading,
  activeQuote,
  onWrite,
  onOpenPage,
  onPreviewPage,
}: {
  artifacts: ArtifactMap;
  mode: SummaryMode | null;
  source: PaperSource;
  loading: boolean;
  activeQuote?: string;
  onWrite: (mode: SummaryMode, settings: SummarySettings, force: boolean) => void;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  const [drafts, setDrafts] = useState<Partial<Record<SummaryMode, Draft>>>({});

  function summaryFor(item: SummaryMode) {
    const artifact = artifacts[summaryKind(item)];
    return artifact && isSummaryArtifact(artifact) ? artifact : null;
  }

  function viewFor(item: SummaryMode): Draft {
    const draft = drafts[item];
    if (draft) return draft;
    const summary = summaryFor(item);
    if (summary) return { words: String(summary.words), tone: summary.tone };
    return { words: String(defaultSummaryWords(item)), tone: "plain" };
  }

  function settingsFor(item: SummaryMode): SummarySettings {
    const view = viewFor(item);
    return {
      words: parseDraftWords(view.words) ?? summaryFor(item)?.words ?? defaultSummaryWords(item),
      tone: view.tone,
    };
  }

  const summary = mode ? summaryFor(mode) : null;
  const view = mode ? viewFor(mode) : null;
  const wordsInvalid = view ? parseDraftWords(view.words) === null : false;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {MODES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onWrite(item, settingsFor(item), false)}
            className={`h-9 cursor-pointer rounded-full px-3 text-sm ${
              item === mode ? "bg-accent text-white" : "bg-surface text-ink ring-1 ring-line"
            }`}
          >
            {summaryLabel(item)}
          </button>
        ))}
      </div>
      {mode && view ? (
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm text-muted">
            Words
            <input
              type="number"
              min={50}
              max={2000}
              inputMode="numeric"
              value={view.words}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [mode]: { words: event.target.value, tone: view.tone },
                }))
              }
              className="mt-1 block h-9 w-24 rounded-full border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <label className="text-sm text-muted">
            Tone
            <select
              value={view.tone}
              onChange={(event) =>
                setDrafts((current) => ({
                  ...current,
                  [mode]: {
                    words: view.words,
                    tone: SUMMARY_TONES.find((tone) => tone === event.target.value) ?? "plain",
                  },
                }))
              }
              className="mt-1 block h-9 cursor-pointer rounded-full border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-accent"
            >
              {SUMMARY_TONES.map((tone) => (
                <option key={tone} value={tone}>
                  {toneLabel(tone)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading || wordsInvalid}
            onClick={() => onWrite(mode, settingsFor(mode), true)}
            className="h-9 cursor-pointer rounded-full bg-accent px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? "Writing…" : summary ? "Rewrite" : "Write"}
          </button>
          {wordsInvalid ? <p className="pb-2 text-sm text-warn">Use 50 to 2000 words.</p> : null}
        </div>
      ) : null}
      {!mode ? (
        <p className="mt-8 text-sm text-muted">Pick a way to read this paper.</p>
      ) : loading && !summary ? (
        <p className="mt-8 text-sm text-muted">Writing the {summaryLabel(mode).toLowerCase()} summary…</p>
      ) : summary ? (
        <div className="mt-8">
          <p className="mb-4 text-sm text-muted">
            {loading ? "Rewriting…" : BLURBS[mode]}
          </p>
          <AnswerBlock
            answer={summary.answer}
            source={source}
            activeQuote={activeQuote}
            onOpenPage={onOpenPage}
            onPreviewPage={onPreviewPage}
          />
        </div>
      ) : (
        <p className="mt-8 text-sm text-muted">{BLURBS[mode]}</p>
      )}
    </div>
  );
}
