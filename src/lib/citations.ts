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

export type TextRun = {
  str: string;
  hasEOL: boolean;
};

function ownersBetween(owners: number[], start: number, length: number): number[] {
  const found = new Set<number>();
  const end = Math.min(owners.length, start + length);
  for (let index = start; index < end; index += 1) {
    const owner = owners[index];
    if (owner !== undefined && owner >= 0) found.add(owner);
  }
  return [...found];
}

function indexesFor(runs: TextRun[], quote: string, breakItems: boolean): number[] {
  const owners: number[] = [];
  let text = "";

  const pushSpace = () => {
    if (text.length === 0 || text.endsWith(" ")) return;
    text += " ";
    owners.push(-1);
  };

  runs.forEach((run, index) => {
    if (breakItems) pushSpace();
    const normalized = run.str.toLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    for (const ch of normalized) {
      if (/\s/u.test(ch)) {
        pushSpace();
        continue;
      }
      text += ch;
      owners.push(index);
    }
    if (run.hasEOL) pushSpace();
  });

  const needle = normalizeQuote(quote);
  if (needle.length >= 8) {
    const at = text.indexOf(needle);
    if (at >= 0) return ownersBetween(owners, at, needle.length);
  }

  const windowSize = Math.min(needle.length, 96);
  if (windowSize >= 24) {
    const window = needle.slice(0, windowSize);
    const at = text.indexOf(window);
    if (at >= 0) return ownersBetween(owners, at, window.length);
  }

  const squashedNeedle = squash(quote);
  if (squashedNeedle.length < 12) return [];
  const squashedOwners: number[] = [];
  let squashed = "";
  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index] ?? "";
    if (!/[a-z0-9 ]/.test(ch)) continue;
    if (ch === " " && (squashed.endsWith(" ") || squashed.length === 0)) continue;
    squashed += ch;
    squashedOwners.push(owners[index] ?? -1);
  }
  const at = squashed.indexOf(squashedNeedle);
  if (at < 0) return [];
  return ownersBetween(squashedOwners, at, squashedNeedle.length);
}

export function quoteRunIndexes(runs: TextRun[], quote: string): number[] {
  const direct = indexesFor(runs, quote, false);
  if (direct.length > 0) return direct;
  return indexesFor(runs, quote, true);
}

export function findQuotePage(pages: PageText[], quote: string): number | null {
  const match = pages.find((page) => pageContains(page.text, quote));
  return match ? match.pageNumber : null;
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
