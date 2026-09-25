import type { PageText, Retrieval } from "@/lib/types";

const CHAR_BUDGET = 150_000 * 4;
const PAGE_CAP = 80_000;

const STOP = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "what",
  "when",
  "where",
  "which",
  "have",
  "were",
  "was",
  "are",
  "not",
  "you",
  "your",
  "how",
  "why",
  "did",
  "does",
  "paper",
  "they",
  "their",
  "about",
  "into",
  "than",
  "then",
  "them",
  "these",
  "those",
  "using",
  "used",
]);

function prepare(pages: PageText[]): PageText[] {
  return pages.map((page) => ({
    pageNumber: page.pageNumber,
    text: page.text.length > PAGE_CAP ? page.text.slice(0, PAGE_CAP) : page.text,
  }));
}

function tokenize(question: string): string[] {
  const matches = question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  return [...new Set(matches.filter((term) => !STOP.has(term)))];
}

function overlap(text: string, terms: string[]): number {
  if (terms.length === 0) return 0;
  const haystack = text.toLowerCase();
  return terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export function retrievePages(pages: PageText[], question: string): Retrieval {
  const prepared = prepare(pages);
  const total = prepared.reduce((sum, page) => sum + page.text.length, 0);
  if (total <= CHAR_BUDGET) return { pages: prepared, truncated: false };

  const must = new Set<number>();
  for (const page of prepared.slice(0, 2)) must.add(page.pageNumber);
  for (const page of prepared.slice(-2)) must.add(page.pageNumber);

  const terms = tokenize(question);
  const ranked = prepared
    .filter((page) => !must.has(page.pageNumber))
    .map((page) => ({ page, score: overlap(page.text, terms) }))
    .sort((a, b) => b.score - a.score || a.page.pageNumber - b.page.pageNumber);

  const chosen: PageText[] = [];
  let used = 0;

  const add = (page: PageText, force: boolean) => {
    if (chosen.some((item) => item.pageNumber === page.pageNumber)) return;
    if (!force && used + page.text.length > CHAR_BUDGET) return;
    chosen.push(page);
    used += page.text.length;
  };

  for (const page of prepared) {
    if (must.has(page.pageNumber)) add(page, true);
  }
  for (const row of ranked) {
    if (row.score <= 0) continue;
    add(row.page, false);
  }

  chosen.sort((a, b) => a.pageNumber - b.pageNumber);
  return { pages: chosen, truncated: chosen.length < prepared.length };
}

export function formatPaper(pages: PageText[]): string {
  return pages
    .map((page) => `--- page ${page.pageNumber} ---\n${page.text || "(no extractable text)"}`)
    .join("\n\n");
}

export function shouldAttachPdf(input: {
  textQuality: "ok" | "low";
  question?: string;
}): boolean {
  if (input.textQuality === "low") return true;
  if (!input.question) return false;
  return /\b(figures?|fig\.|tables?|equations?|eq\.|charts?|diagrams?)\b/i.test(input.question);
}
