import { PaperlyError } from "@/lib/errors";
import { extractPdfPages } from "@/lib/extract";
import { generateJson } from "@/lib/gemini";
import { METADATA_SCHEMA, readModelMetadata, SYSTEM_PROMPT } from "@/lib/ground";
import { inferMetadata, measureQuality } from "@/lib/metadata";
import { createPaper, updatePaper } from "@/lib/store";
import type { PageText, Paper } from "@/lib/types";

const MAX_PDF_BYTES = 50 * 1024 * 1024;
const MAX_TEXT_CHARS = 2_000_000;
const MIN_TEXT_CHARS = 80;

function isPdf(bytes: Uint8Array): boolean {
  return bytes.length > 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function safeFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "paper.pdf";
  const cleaned = base.replace(/[^\w.\- ()]+/g, "").slice(0, 180);
  return cleaned || "paper.pdf";
}

async function enrichMetadata(paper: Paper, pages: PageText[]): Promise<Paper> {
  if ((paper.title && paper.abstract) || !process.env.GEMINI_API_KEY?.trim()) return paper;
  const sample = pages
    .slice(0, 2)
    .map((page) => `--- page ${page.pageNumber} ---\n${page.text}`)
    .join("\n\n")
    .slice(0, 12_000);

  try {
    const generated = await generateJson({
      system: SYSTEM_PROMPT,
      prompt: `Extract bibliographic metadata from the start of this paper. Use an empty string or 0 when a field is not printed. Do not guess.\n\n${sample}`,
      schema: METADATA_SCHEMA,
      maxOutputTokens: 1024,
    });
    const meta = readModelMetadata(generated.data);
    return updatePaper(paper.id, {
      title: paper.title ?? meta.title,
      authors: paper.authors.length > 0 ? paper.authors : meta.authors,
      year: paper.year ?? meta.year,
      abstract: paper.abstract ?? meta.abstract,
    });
  } catch (error) {
    console.error(error);
    return paper;
  }
}

function buildPaper(input: {
  source: Paper["source"];
  filename: string | null;
  pages: PageText[];
}): Paper {
  const meta = inferMetadata(input.pages);
  return {
    id: crypto.randomUUID(),
    source: input.source,
    filename: input.filename,
    title: meta.title,
    authors: meta.authors,
    year: meta.year,
    abstract: meta.abstract,
    pageCount: input.pages.length,
    createdAt: new Date().toISOString(),
    textQuality: measureQuality(input.pages),
    geminiFile: null,
  };
}

export async function ingestPdf(file: File): Promise<Paper> {
  if (file.size <= 0) throw new PaperlyError("That PDF is empty.");
  if (file.size > MAX_PDF_BYTES) throw new PaperlyError("PDFs must be 50 MB or smaller.");
  const name = file.name.toLowerCase();
  if (file.type && file.type !== "application/pdf" && !name.endsWith(".pdf")) {
    throw new PaperlyError("Upload a PDF, or paste the paper text.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!isPdf(bytes)) throw new PaperlyError("That file is not a PDF.");

  const pages = await extractPdfPages(bytes);
  if (pages.length === 0) throw new PaperlyError("That PDF has no pages.");

  const paper = buildPaper({
    source: "pdf",
    filename: safeFilename(file.name || "paper.pdf"),
    pages,
  });
  await createPaper({ paper, pages, pdf: bytes });
  return enrichMetadata(paper, pages);
}

export async function ingestText(text: string): Promise<Paper> {
  const cleaned = text.replace(/\r\n/g, "\n").trim();
  if (cleaned.length < MIN_TEXT_CHARS) {
    throw new PaperlyError("Paste more of the paper. A few sentences is not enough.");
  }
  if (cleaned.length > MAX_TEXT_CHARS) {
    throw new PaperlyError("That text is too long to store.");
  }

  const pages: PageText[] = [{ pageNumber: 1, text: cleaned }];
  const paper = buildPaper({ source: "text", filename: null, pages });
  await createPaper({ paper, pages, pdf: null });
  return enrichMetadata(paper, pages);
}
