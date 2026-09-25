import type { Citation, PaperSource } from "@/lib/types";

export function CitationList({
  citations,
  source,
  onOpenPage,
}: {
  citations: Citation[];
  source: PaperSource;
  onOpenPage: (page: number) => void;
}) {
  if (citations.length === 0) return null;

  return (
    <ul className="mt-4 flex flex-col gap-2">
      {citations.map((citation, index) => {
        const sourceLabel = citation.label
          ? `${citation.label}${source === "pdf" ? `, page ${citation.page}` : ""}`
          : source === "pdf"
            ? `Page ${citation.page}`
            : "Pasted text";
        return (
          <li key={`${citation.page}-${index}`} className="border-l-2 border-line pl-3">
            <p className="text-sm leading-6 text-ink">“{citation.quote}”</p>
            {source === "pdf" ? (
              <button
                type="button"
                onClick={() => onOpenPage(citation.page)}
                className="mt-1 cursor-pointer text-left text-sm text-accent"
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
