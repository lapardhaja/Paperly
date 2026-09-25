import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

import { PaperlyError } from "@/lib/errors";
import type { PageText } from "@/lib/types";

type PdfTextItem = {
  str: string;
  transform: number[];
  hasEOL?: boolean;
};

GlobalWorkerOptions.workerSrc = pathToFileURL(
  path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"),
).href;

function isPdfTextItem(item: unknown): item is PdfTextItem {
  if (typeof item !== "object" || item === null) return false;
  const candidate = item as { str?: unknown; transform?: unknown };
  return typeof candidate.str === "string" && Array.isArray(candidate.transform);
}

function itemsToText(items: unknown[]): string {
  const lines: string[] = [];
  let currentY: number | null = null;
  let buffer = "";

  const flush = () => {
    const line = buffer.replace(/[ \t]+/g, " ").trim();
    if (line) lines.push(line);
    buffer = "";
  };

  for (const item of items) {
    if (!isPdfTextItem(item) || !item.str) continue;
    const y = Number(item.transform[5] ?? 0);
    if (currentY !== null && Math.abs(currentY - y) > 3) flush();
    currentY = y;
    if (buffer && !buffer.endsWith(" ") && !item.str.startsWith(" ")) buffer += " ";
    buffer += item.str;
    if (item.hasEOL) {
      flush();
      currentY = null;
    }
  }
  flush();
  return lines.join("\n");
}

export async function extractPdfPages(bytes: Uint8Array): Promise<PageText[]> {
  const data = new Uint8Array(bytes);
  const task = getDocument({
    data,
    useSystemFonts: true,
    verbosity: 0,
  });
  const doc = await task.promise;

  try {
    if (doc.numPages > 1000) {
      throw new PaperlyError("PDFs must be 1000 pages or fewer.");
    }
    const pages: PageText[] = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push({ pageNumber, text: itemsToText(content.items) });
    }
    return pages;
  } finally {
    await task.destroy();
  }
}
