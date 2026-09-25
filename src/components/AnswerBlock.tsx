import { CitationList } from "@/components/CitationList";
import { MarkdownView } from "@/components/MarkdownView";
import { coverageLine } from "@/lib/format";
import type { GroundedAnswer, PaperSource } from "@/lib/types";

export function AnswerBlock({
  answer,
  source,
  onOpenPage,
}: {
  answer: GroundedAnswer;
  source: PaperSource;
  onOpenPage: (page: number) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-xs tracking-wide text-muted uppercase">
        {coverageLine(answer.coverage, answer.truncated, answer.pagesUsed)}
      </p>
      <MarkdownView text={answer.answerMarkdown} />
      {answer.analysisMarkdown ? (
        <div className="mt-6 rounded-2xl bg-accent-soft px-4 py-4">
          <p className="text-xs tracking-wide text-warn uppercase">Paperly&apos;s analysis</p>
          <p className="mt-1 text-xs text-muted">This is not a statement from the paper.</p>
          <div className="mt-3">
            <MarkdownView text={answer.analysisMarkdown} />
          </div>
        </div>
      ) : null}
      <CitationList citations={answer.citations} source={source} onOpenPage={onOpenPage} />
    </div>
  );
}
