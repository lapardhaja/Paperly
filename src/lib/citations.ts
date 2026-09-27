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

const STOP_WORDS = new Set([
  "that", "this", "with", "from", "into", "than", "then", "them", "they", "their", "there", "these",
  "those", "about", "after", "before", "which", "while", "where", "when", "what", "have", "been",
  "being", "were", "will", "would", "could", "should", "across", "under", "over", "among", "between",
  "without", "within", "using", "such", "also", "only", "more", "most", "other", "some", "same",
  "each", "both", "through", "because", "does", "make", "many", "much", "very", "just", "like",
  "well", "even", "still", "your",
]);

function claimWords(value: string): string[] {
  return normalizeQuote(value).split(" ").filter((word) => word.length > 0).slice(0, 80);
}

function pagePool(pages: PageText[], preferred: number[]): PageText[] {
  const preferredPages = preferred.length
    ? pages.filter((page) => preferred.includes(page.pageNumber) && page.text.trim().length > 0)
    : [];
  if (preferredPages.length > 0) return preferredPages;
  return pages.filter((page) => page.text.trim().length > 0);
}

function tidyQuote(quote: string): string {
  return quote.replace(/[,:;]+$/g, "").trim();
}

function longestWindow(page: PageText, words: string[]): { quote: string; length: number } | null {
  const max = Math.min(words.length, 22);
  const min = Math.min(4, words.length);
  for (let size = max; size >= min; size -= 1) {
    for (let start = 0; start + size <= words.length; start += 1) {
      const quote = tidyQuote(words.slice(start, start + size).join(" "));
      if (quote.length >= 8 && pageContains(page.text, quote)) return { quote, length: size };
    }
  }
  return null;
}

function contentKey(word: string): string {
  return word.replace(/[^a-z0-9]/g, "");
}

function fuzzyWindow(page: PageText, wanted: Set<string>): { quote: string; score: number } | null {
  const words = normalizeQuote(page.text).split(" ").filter((word) => word.length > 0);
  let best: { quote: string; score: number } | null = null;
  const size = 18;
  for (let start = 0; start < words.length; start += 1) {
    const window = words.slice(start, start + size);
    if (window.length < 6) break;
    const seen = new Set<string>();
    for (const word of window) {
      const key = contentKey(word);
      if (key.length > 3 && wanted.has(key)) seen.add(key);
    }
    if (seen.size < 3) continue;
    if (!best || seen.size > best.score) {
      best = { quote: tidyQuote(window.join(" ")), score: seen.size };
    }
  }
  return best;
}

function wantedWords(claim: string): Set<string> {
  const wanted = new Set<string>();
  for (const word of claimWords(claim)) {
    const key = contentKey(word);
    if (key.length > 3 && !STOP_WORDS.has(key)) wanted.add(key);
  }
  return wanted;
}

function verbatimHighlight(
  pages: PageText[],
  words: string[],
  preferred: number[],
): { page: number; quote: string } | null {
  let best: { page: number; quote: string; length: number } | null = null;
  for (const page of pagePool(pages, preferred)) {
    const hit = longestWindow(page, words);
    if (!hit) continue;
    if (!best || hit.length > best.length) best = { page: page.pageNumber, quote: hit.quote, length: hit.length };
  }
  return best ? { page: best.page, quote: best.quote } : null;
}

function fuzzyHighlight(
  pages: PageText[],
  claim: string,
  preferred: number[],
): { page: number; quote: string } | null {
  const wanted = wantedWords(claim);
  if (wanted.size < 3) return null;
  let best: { page: number; quote: string; score: number } | null = null;
  for (const page of pagePool(pages, preferred)) {
    const hit = fuzzyWindow(page, wanted);
    if (!hit) continue;
    if (!best || hit.score > best.score) best = { page: page.pageNumber, quote: hit.quote, score: hit.score };
  }
  return best ? { page: best.page, quote: best.quote } : null;
}

export function bestHighlight(
  pages: PageText[],
  claim: string,
  preferred: number[],
): { page: number; quote: string } | null {
  const words = claimWords(claim);
  if (words.length === 0) return null;
  const verbatim = verbatimHighlight(pages, words, preferred) ?? (preferred.length > 0 ? verbatimHighlight(pages, words, []) : null);
  if (verbatim) return verbatim;
  return fuzzyHighlight(pages, claim, preferred) ?? (preferred.length > 0 ? fuzzyHighlight(pages, claim, []) : null);
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
