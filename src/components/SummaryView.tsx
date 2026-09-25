"use client";

import { useState } from "react";

import { AnswerBlock } from "@/components/AnswerBlock";
import { SkeletonBlock, Waiting } from "@/components/Waiting";
import {
  defaultSummaryWords,
  isSummaryArtifact,
  summaryKind,
  summaryLabel,
  toneLabel,
} from "@/lib/format";
import {
  PRIMARY_TONES,
  SUMMARY_TONES,
  type ArtifactMap,
  type OpenPage,
  type PaperSource,
  type SummaryMode,
  type SummarySettings,
  type SummaryTone,
} from "@/lib/types";

const MODES: SummaryMode[] = ["quick", "detailed", "eli5"];

const LENGTH_HINT: Record<SummaryMode, string> = {
  quick: "150–300 words",
  detailed: "500–800 words",
  executive: "Short brief",
  eli5: "1,200+ words",
};

const WRITE_STEPS = [
  "Reading the page text",
  "Digitizing scans and handwriting",
  "Attaching page citations",
  "Writing the structured summary",
] as const;

type Draft = { words: string; tone: SummaryTone; focus: string };

function parseDraftWords(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const words = Number(value);
  if (words < 50 || words > 2000) return null;
  return words;
}

function toneOptions(current: SummaryTone): readonly SummaryTone[] {
  if ((PRIMARY_TONES as readonly string[]).includes(current)) return PRIMARY_TONES;
  return [current, ...PRIMARY_TONES];
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
    if (summary) return { words: String(summary.words), tone: summary.tone, focus: summary.focus ?? "" };
    return { words: String(defaultSummaryWords(item)), tone: "academic", focus: "" };
  }

  function settingsFor(item: SummaryMode): SummarySettings {
    const view = viewFor(item);
    return {
      words: parseDraftWords(view.words) ?? summaryFor(item)?.words ?? defaultSummaryWords(item),
      tone: view.tone,
      focus: view.focus.trim(),
    };
  }

  function patch(item: SummaryMode, next: Draft) {
    setDrafts((current) => ({ ...current, [item]: next }));
  }

  const summary = mode ? summaryFor(mode) : null;
  const view = mode ? viewFor(mode) : null;
  const wordsInvalid = view ? parseDraftWords(view.words) === null : false;
  const activeMode = mode ?? "detailed";
  const activeView = view ?? viewFor(activeMode);

  return (
    <div>
      <div className="tool-card p-4">
        <p className="kicker text-accent">Length</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MODES.map((item) => {
            const selected = item === activeMode;
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  const base = viewFor(item);
                  const settings: SummarySettings = {
                    words: parseDraftWords(base.words) ?? defaultSummaryWords(item),
                    tone: activeView.tone,
                    focus: activeView.focus.trim(),
                  };
                  patch(item, {
                    words: String(settings.words),
                    tone: activeView.tone,
                    focus: activeView.focus,
                  });
                  onWrite(item, settings, false);
                }}
                className={`h-10 cursor-pointer rounded-full px-4 text-sm font-semibold transition active:scale-[0.98] ${
                  selected
                    ? "bg-accent text-white shadow-[0_8px_18px_rgba(21,40,71,0.22)]"
                    : "bg-surface text-ink ring-2 ring-line hover:ring-accent"
                }`}
              >
                {summaryLabel(item)}
                <span className={selected ? "ml-2 text-white/90" : "ml-2 text-muted"}>
                  {LENGTH_HINT[item]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
          <label className="text-sm font-semibold text-ink">
            Focus questions
            <textarea
              value={activeView.focus}
              rows={3}
              placeholder="Optional. These are answered first, from the document only."
              onChange={(event) =>
                patch(activeMode, {
                  words: activeView.words,
                  tone: activeView.tone,
                  focus: event.target.value,
                })
              }
              className="mt-1 block w-full resize-y rounded-xl border-2 border-line bg-surface px-3 py-2 text-sm font-medium text-ink outline-none focus:border-accent"
            />
          </label>
          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold text-ink">
              Tone
              <select
                value={activeView.tone}
                onChange={(event) =>
                  patch(activeMode, {
                    words: activeView.words,
                    tone: SUMMARY_TONES.find((tone) => tone === event.target.value) ?? "academic",
                    focus: activeView.focus,
                  })
                }
                className="mt-1 block h-10 w-full cursor-pointer rounded-full border-2 border-line bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-accent"
              >
                {toneOptions(activeView.tone).map((tone) => (
                  <option key={tone} value={tone}>
                    {toneLabel(tone)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-ink">
              Words
              <input
                type="number"
                min={50}
                max={2000}
                inputMode="numeric"
                value={activeView.words}
                onChange={(event) =>
                  patch(activeMode, {
                    words: event.target.value,
                    tone: activeView.tone,
                    focus: activeView.focus,
                  })
                }
                className="mt-1 block h-10 w-full rounded-full border-2 border-line bg-surface px-3 text-sm font-semibold text-ink outline-none focus:border-accent"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={loading || wordsInvalid}
            onClick={() => onWrite(activeMode, settingsFor(activeMode), true)}
            className="btn-primary h-11 px-5 text-sm"
          >
            {loading ? "Summarizing…" : summary ? "Rewrite summary" : "Summarize PDF"}
          </button>
          {wordsInvalid ? <p className="text-sm font-semibold text-warn">Use 50 to 2000 words.</p> : null}
        </div>
      </div>
      {loading && !summary ? (
        <div className="mt-6">
          <Waiting
            title={`Writing the ${summaryLabel(activeMode).toLowerCase()} summary`}
            steps={WRITE_STEPS}
          />
          <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <SkeletonBlock lines={7} />
          </div>
        </div>
      ) : null}
      {loading && summary ? (
        <div className="mt-6">
          <Waiting title="Rewriting the summary" steps={WRITE_STEPS} compact />
        </div>
      ) : null}
      {summary ? (
        <div className={`mt-6 ${loading ? "opacity-60" : ""}`}>
          <AnswerBlock
            answer={summary.answer}
            source={source}
            activeQuote={activeQuote}
            onOpenPage={onOpenPage}
            onPreviewPage={onPreviewPage}
          />
        </div>
      ) : null}
    </div>
  );
}
