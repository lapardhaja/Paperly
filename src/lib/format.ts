import type { Coverage, InsightKey, SummaryMode, WorkspaceTab } from "@/lib/types";

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
      return "overview";
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
      return "Quick";
    case "detailed":
      return "Detailed";
    case "executive":
      return "Executive";
    case "eli5":
      return "Explain like I'm new";
    default: {
      const unreachable: never = mode;
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
