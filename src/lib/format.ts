import type {
  Artifact,
  ArtifactKind,
  Coverage,
  InsightKey,
  SummaryArtifact,
  SummaryMode,
  SummaryTone,
  WorkspaceTab,
} from "@/lib/types";

export const MISSING_LINE =
  "Paperly could not locate this information in the provided document.";

export function tabLabel(tab: WorkspaceTab): string {
  switch (tab) {
    case "overview":
      return "Overview";
    case "summary":
      return "Summary";
    case "analysis":
      return "Analysis";
    case "chat":
      return "Chat";
    default: {
      const unreachable: never = tab;
      return unreachable;
    }
  }
}

export function parseTab(value: string | undefined): WorkspaceTab {
  switch (value) {
    case "summary":
    case "analysis":
    case "chat":
    case "overview":
      return value;
    default:
      return "summary";
  }
}

export function insightLabel(key: InsightKey): string {
  switch (key) {
    case "researchQuestion":
      return "Research question";
    case "contribution":
      return "Key contribution";
    case "method":
      return "Method";
    case "dataset":
      return "Dataset";
    case "findings":
      return "Key findings";
    case "limitations":
      return "Limitations";
    case "numbers":
      return "Important numbers";
    case "conclusion":
      return "Conclusion";
    default: {
      const unreachable: never = key;
      return unreachable;
    }
  }
}

export function summaryKind(
  mode: SummaryMode,
): "summary-quick" | "summary-detailed" | "summary-executive" | "summary-eli5" {
  switch (mode) {
    case "quick":
      return "summary-quick";
    case "detailed":
      return "summary-detailed";
    case "executive":
      return "summary-executive";
    case "eli5":
      return "summary-eli5";
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

export function summaryLabel(mode: SummaryMode): string {
  switch (mode) {
    case "quick":
      return "Brief";
    case "detailed":
      return "Standard";
    case "executive":
      return "Executive";
    case "eli5":
      return "Comprehensive";
    default: {
      const unreachable: never = mode;
      return unreachable;
    }
  }
}

export function isSummaryKind(kind: ArtifactKind): kind is SummaryArtifact["kind"] {
  switch (kind) {
    case "summary-quick":
    case "summary-detailed":
    case "summary-executive":
    case "summary-eli5":
      return true;
    case "insights":
    case "analysis":
      return false;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function isSummaryArtifact(artifact: Artifact): artifact is SummaryArtifact {
  return isSummaryKind(artifact.kind);
}

export function defaultWordsForKind(kind: SummaryArtifact["kind"]): number {
  switch (kind) {
    case "summary-quick":
      return 250;
    case "summary-detailed":
      return 650;
    case "summary-executive":
      return 400;
    case "summary-eli5":
      return 1400;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function defaultSummaryWords(mode: SummaryMode): number {
  return defaultWordsForKind(summaryKind(mode));
}

export function clampWords(value: unknown, fallback: number): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(2000, Math.max(50, Math.round(parsed)));
}

export function parseTone(value: unknown): SummaryTone {
  switch (value) {
    case "academic":
    case "executive":
    case "simplified":
    case "plain":
    case "technical":
    case "conversational":
      return value;
    default:
      return "academic";
  }
}

export function toneLabel(tone: SummaryTone): string {
  switch (tone) {
    case "academic":
      return "Academic / Technical";
    case "executive":
      return "C-Suite / Executive";
    case "simplified":
      return "Simplified / Layperson";
    case "plain":
      return "Plain";
    case "technical":
      return "Technical";
    case "conversational":
      return "Conversational";
    default: {
      const unreachable: never = tone;
      return unreachable;
    }
  }
}

export function formatPageList(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return "";

  const ranges: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  for (const page of sorted.slice(1)) {
    if (page === end + 1) {
      end = page;
      continue;
    }
    ranges.push(start === end ? `${start}` : `${start}–${end}`);
    start = page;
    end = page;
  }
  ranges.push(start === end ? `${start}` : `${start}–${end}`);
  return ranges.join(", ");
}

export function coverageLine(coverage: Coverage, truncated: boolean, pagesUsed: number[]): string {
  if (coverage === "not_in_paper") return "Not in this paper.";
  if (truncated) return `Based on pages ${formatPageList(pagesUsed)} of this paper.`;
  if (coverage === "partial") return "Based on this paper. Some of this is not in the document.";
  return "Based on this paper.";
}

export function paperMetaLine(input: {
  authors: string[];
  year: number | null;
  pageCount: number;
  source: "pdf" | "text";
}): string {
  const parts: string[] = [];
  if (input.authors.length > 0) parts.push(input.authors.join(", "));
  if (input.year) parts.push(String(input.year));
  if (input.source === "pdf") {
    parts.push(input.pageCount === 1 ? "1 page" : `${input.pageCount} pages`);
  } else {
    parts.push("Pasted text");
  }
  return parts.join(" · ");
}
