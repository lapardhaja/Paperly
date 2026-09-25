import type { PageText, TextQuality } from "@/lib/types";

const SKIP_LINE =
  /^(arxiv|proceedings|journal|vol\.|volume|doi|https?:|www\.|copyright|preprint|manuscript|published|received|accepted)/i;

export type InferredMetadata = {
  title: string | null;
  authors: string[];
  year: number | null;
  abstract: string | null;
};

export function measureQuality(pages: PageText[]): TextQuality {
  if (pages.length === 0) return "low";
  const chars = pages.reduce((total, page) => total + page.text.replace(/\s/g, "").length, 0);
  return chars / pages.length < 80 ? "low" : "ok";
}

function looksLikeAuthors(line: string): boolean {
  const cleaned = line.replace(/[*†‡§\d]/g, "").trim();
  if (cleaned.length < 3 || cleaned.length > 180) return false;
  if (/\b(university|abstract|department|introduction|@|http)\b/i.test(cleaned)) return false;
  const parts = cleaned
    .split(/,| and | & /i)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0 || parts.length > 12) return false;
  return parts.every((part) => /^[\p{L}.'’\- ]{2,60}$/u.test(part));
}

function extractAbstract(text: string): string | null {
  const match = text.match(
    /\babstract\b[:\s—–-]*([\s\S]{40,2500}?)(?=\n\s*(?:\d+\.?\s+)?(?:introduction|keywords|index terms|1\s+introduction)\b)/i,
  );
  if (!match?.[1]) return null;
  const abstract = match[1].replace(/\s+/g, " ").trim();
  return abstract.length >= 40 ? abstract : null;
}

export function inferMetadata(pages: PageText[]): InferredMetadata {
  const first = pages[0]?.text ?? "";
  const lines = first
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const contentLines = lines.filter(
    (line) => !SKIP_LINE.test(line) && !/^[\d\s./:-]+$/.test(line),
  );
  const abstractAt = contentLines.findIndex((line) => /^abstract\b/i.test(line));
  const head =
    abstractAt >= 0 ? contentLines.slice(0, abstractAt) : contentLines.slice(0, 6);
  const titleLine = head.find((line) => line.length >= 12 && line.length <= 200) ?? null;
  const titleIndex = titleLine ? head.indexOf(titleLine) : -1;
  let title = titleLine;
  const next = titleIndex >= 0 ? head[titleIndex + 1] : undefined;
  if (
    title &&
    next &&
    title.length < 50 &&
    next.length >= 12 &&
    next.length <= 120 &&
    !looksLikeAuthors(next) &&
    !/^abstract\b/i.test(next)
  ) {
    title = `${title} ${next}`;
  }

  const authorLine = head.find((line) => line !== titleLine && looksLikeAuthors(line));
  const authors = authorLine
    ? authorLine
        .replace(/[*†‡§\d]/g, "")
        .split(/,| and | & /i)
        .map((name) => name.trim())
        .filter((name) => name.length > 1)
    : [];

  const yearMatch = first.slice(0, 800).match(/\b(?:19|20)\d{2}\b/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  const abstract = extractAbstract(pages.slice(0, 2).map((page) => page.text).join("\n\n"));

  return { title, authors, year, abstract };
}
