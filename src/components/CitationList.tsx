import { normalizeQuote } from "@/lib/citations";
import type { Citation, OpenPage, PaperSource } from "@/lib/types";

export function CitationList({
  citations,
  source,
  activeQuote,
  onOpenPage,
  onPreviewPage,
}: {
  citations: Citation[];
  source: PaperSource;
  activeQuote?: string;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  if (citations.length === 0) return null;
  const active = activeQuote ? normalizeQuote(activeQuote) : "";

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {citations.map((citation, index) => {
        const sourceLabel = citation.label
          ? `${citation.label}${source === "pdf" ? `, page ${citation.page}` : ""}`
          : source === "pdf"
            ? `Page ${citation.page}`
            : "Pasted text";
        const selected = active.length > 0 && normalizeQuote(citation.quote) === active;
        return (
          <li
            key={`${citation.page}-${index}`}
            onMouseEnter={() => {
              if (source === "pdf") onPreviewPage(citation.page, citation.quote);
            }}
            className={`rounded-r-xl border-l-[3px] py-1 pl-3 ${selected ? "border-accent bg-accent-soft" : "border-[#8a8a8a]"}`}
          >
            <p className="text-sm leading-6 font-medium text-ink">“{citation.quote}”</p>
            {source === "pdf" ? (
              <button
                type="button"
                onClick={() => onOpenPage(citation.page, citation.quote)}
                className="mt-1 cursor-pointer text-left text-sm font-bold text-accent"
              >
                Source: {sourceLabel}
              </button>
            ) : (
              <p className="mt-1 text-sm text-muted">Source: {sourceLabel}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
