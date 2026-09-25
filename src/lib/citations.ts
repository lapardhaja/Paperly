import type { Citation, PageText } from "@/lib/types";

export function normalizeQuote(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function squash(value: string): string {
  return normalizeQuote(value).replace(/[^a-z0-9 ]+/g, "");
}

function pageContains(pageText: string, quote: string): boolean {
  const normalizedPage = normalizeQuote(pageText);
  const normalizedQuote = normalizeQuote(quote);
  if (normalizedQuote.length >= 8 && normalizedPage.includes(normalizedQuote)) return true;
  const squashedQuote = squash(quote);
  if (squashedQuote.length < 12) return false;
  return squash(pageText).includes(squashedQuote);
}

export function verifyCitations(citations: Citation[], pages: PageText[]): Citation[] {
  const kept: Citation[] = [];

  for (const citation of citations) {
    const quote = citation.quote.trim();
    if (normalizeQuote(quote).length < 8) continue;

    const stated = pages.find((page) => page.pageNumber === citation.page);
    const match =
      (stated && pageContains(stated.text, quote) ? stated : undefined) ??
      pages.find((page) => pageContains(page.text, quote));
    if (!match) continue;

    const label = citation.label?.trim() || null;
    const next: Citation = {
      page: match.pageNumber,
      quote,
      label: label ? label.slice(0, 80) : null,
    };
    const duplicate = kept.some(
      (item) => item.page === next.page && normalizeQuote(item.quote) === normalizeQuote(next.quote),
    );
    if (!duplicate) kept.push(next);
  }

  return kept;
}
