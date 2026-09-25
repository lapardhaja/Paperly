import { CitationList } from "@/components/CitationList";
import { MarkdownView } from "@/components/MarkdownView";
import { coverageLine } from "@/lib/format";
import type { GroundedAnswer, OpenPage, PaperSource } from "@/lib/types";

export function AnswerBlock({
  answer,
  source,
  activeQuote,
  onOpenPage,
  onPreviewPage,
}: {
  answer: GroundedAnswer;
  source: PaperSource;
  activeQuote?: string;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  return (
    <div data-paper-source>
      <p className="kicker mb-3 text-accent">
        {coverageLine(answer.coverage, answer.truncated, answer.pagesUsed)}
      </p>
      <MarkdownView text={answer.answerMarkdown} />
      {answer.analysisMarkdown ? (
        <div className="mt-6 rounded-2xl border border-[#e4b4b2] bg-[#fdf3f2] px-4 py-4">
          <p className="text-xs font-bold tracking-[0.14em] text-warn uppercase">Paperly&apos;s analysis</p>
          <p className="mt-1 text-xs font-semibold text-ink">This is not a statement from the document.</p>
          <div className="mt-3">
            <MarkdownView text={answer.analysisMarkdown} />
          </div>
        </div>
      ) : null}
      <CitationList
        citations={answer.citations}
        source={source}
        activeQuote={activeQuote}
        onOpenPage={onOpenPage}
        onPreviewPage={onPreviewPage}
      />
    </div>
  );
}
