import { z } from "zod";

import { PaperlyError } from "@/lib/errors";
import { INSIGHT_KEYS, type Artifact, type ArtifactKind, type ChatMessage, type Citation, type Coverage, type InsightKey, type PaperSource } from "@/lib/types";

const citationSchema = z.object({
  page: z.number().int().positive(),
  quote: z.string().min(1),
  label: z.string().nullable(),
});

const coverageSchema = z.enum(["grounded", "partial", "not_in_paper"]);

const groundedSchema = z.object({
  answerMarkdown: z.string(),
  analysisMarkdown: z.string().nullable(),
  citations: z.array(citationSchema),
  coverage: coverageSchema,
  pagesUsed: z.array(z.number().int().positive()),
  truncated: z.boolean(),
});

const insightKeySchema = z.enum(INSIGHT_KEYS);

const insightsSchema = z.object({
  kind: z.literal("insights"),
  cards: z.array(
    z.object({
      key: insightKeySchema,
      body: z.string(),
      citations: z.array(citationSchema),
    }),
  ),
  coverage: coverageSchema,
  pagesUsed: z.array(z.number().int().positive()),
  truncated: z.boolean(),
  createdAt: z.string(),
});

function summarySchema(
  kind: "summary-quick" | "summary-detailed" | "summary-executive" | "summary-eli5",
) {
  return z.object({
    kind: z.literal(kind),
    answer: groundedSchema,
    createdAt: z.string(),
  });
}

const analysisItemSchema = z.object({
  text: z.string(),
  citations: z.array(citationSchema),
});

const analysisSchema = z.object({
  kind: z.literal("analysis"),
  strengths: z.array(analysisItemSchema),
  authorLimitations: z.array(analysisItemSchema),
  paperlyAnalysis: z.array(analysisItemSchema),
  coverage: coverageSchema,
  pagesUsed: z.array(z.number().int().positive()),
  truncated: z.boolean(),
  createdAt: z.string(),
});

const artifactSchema = z.discriminatedUnion("kind", [
  insightsSchema,
  summarySchema("summary-quick"),
  summarySchema("summary-detailed"),
  summarySchema("summary-executive"),
  summarySchema("summary-eli5"),
  analysisSchema,
]);

const messageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  answer: groundedSchema.nullable(),
  createdAt: z.string(),
});

const citationJson = {
  type: "object",
  properties: {
    page: { type: "integer" },
    quote: { type: "string" },
    label: { type: "string" },
  },
  required: ["page", "quote", "label"],
} as const;

export const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answerMarkdown: { type: "string" },
    analysisMarkdown: { type: "string" },
    citations: { type: "array", items: citationJson },
    coverage: { type: "string", enum: ["grounded", "partial", "not_in_paper"] },
  },
  required: ["answerMarkdown", "analysisMarkdown", "citations", "coverage"],
} as const;

export const INSIGHTS_SCHEMA = {
  type: "object",
  properties: {
    researchQuestion: { type: "string" },
    contribution: { type: "string" },
    method: { type: "string" },
    dataset: { type: "string" },
    findings: { type: "string" },
    limitations: { type: "string" },
    numbers: { type: "string" },
    conclusion: { type: "string" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          field: { type: "string" },
          page: { type: "integer" },
          quote: { type: "string" },
          label: { type: "string" },
        },
        required: ["field", "page", "quote", "label"],
      },
    },
    coverage: { type: "string", enum: ["grounded", "partial", "not_in_paper"] },
  },
  required: [
    "researchQuestion",
    "contribution",
    "method",
    "dataset",
    "findings",
    "limitations",
    "numbers",
    "conclusion",
    "citations",
    "coverage",
  ],
} as const;

const analysisItemJson = {
  type: "object",
  properties: {
    text: { type: "string" },
    citations: { type: "array", items: citationJson },
  },
  required: ["text", "citations"],
} as const;

export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    strengths: { type: "array", items: analysisItemJson },
    authorLimitations: { type: "array", items: analysisItemJson },
    paperlyAnalysis: { type: "array", items: analysisItemJson },
    coverage: { type: "string", enum: ["grounded", "partial", "not_in_paper"] },
  },
  required: ["strengths", "authorLimitations", "paperlyAnalysis", "coverage"],
} as const;

export const METADATA_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    authors: { type: "array", items: { type: "string" } },
    year: { type: "integer" },
    abstract: { type: "string" },
  },
  required: ["title", "authors", "year", "abstract"],
} as const;

export const SYSTEM_PROMPT = `You are Paperly, a research reading assistant. You answer from one uploaded paper.

Rules:
- Facts come only from the PAPER text in this request. Earlier messages are not evidence.
- Do not invent numbers, datasets, methods, baselines, results, limitations, sections, figures, or citations.
- If the paper does not say it, do not state it as fact. Set coverage to "not_in_paper" when you cannot answer, or "partial" when you can answer only part. Say what is missing in the answer.
- Paper facts stay separate from your own reasoning. Never write a judgment as if the authors stated it.
- citations: quote must be copied verbatim from one page of the PAPER text, a full clause or sentence. page is that page number. label is a short locator such as "Results" or "Table 2" when the surrounding text supports it, otherwise "".
- Do not cite a page you cannot quote.
- Be concise. Match the amount of detail to the request. Use short markdown when it makes the answer easier to scan.
- When only some pages are included, do not treat the missing pages as empty.`;

export function retrievalQuery(kind: ArtifactKind): string {
  switch (kind) {
    case "insights":
      return "research question contribution method dataset findings limitations results conclusion";
    case "summary-quick":
      return "abstract introduction conclusion contribution";
    case "summary-detailed":
      return "research question motivation methodology data results conclusions";
    case "summary-executive":
      return "findings contribution results conclusion";
    case "summary-eli5":
      return "abstract introduction method results";
    case "analysis":
      return "limitations discussion method results assumptions baselines";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function artifactInstruction(kind: ArtifactKind, source: PaperSource): string {
  const pasted =
    source === "text"
      ? "This document was pasted. Every citation uses page 1. Put a section name in label when one is visible."
      : "";

  switch (kind) {
    case "insights":
      return `Fill every field in plain language a reader can scan. Each field is one to three sentences. If the paper does not state it, write "Not stated in this paper."
citations is an array. Each item's field is one of: researchQuestion, contribution, method, dataset, findings, limitations, numbers, conclusion. Only include a citation when you can quote that field from the paper.
numbers lists important quantitative results that appear in the paper, or "Not stated in this paper."
coverage is grounded when the main fields are supported, partial when several are missing, and not_in_paper only if this is not a research paper.
${pasted}`;
    case "summary-quick":
      return `Write a short explanation in plain language, about 150 words. Start with the point of the paper, then how they studied it, then what they found. analysisMarkdown must be "".
${pasted}`;
    case "summary-detailed":
      return `Write a detailed summary with these markdown headings, in this order:
## Research question
## Motivation
## Methodology
## Data
## Results
## Conclusions
Under each heading, write a short paragraph. If that part is not in the paper, say so under the heading. analysisMarkdown must be "".
${pasted}`;
    case "summary-executive":
      return `Write a concise brief for someone who needs the paper quickly. Use these headings:
## What they did
## What they found
## Why it matters
Stay under 250 words. analysisMarkdown must be "".
${pasted}`;
    case "summary-eli5":
      return `Explain the paper without assuming advanced knowledge. Define necessary jargon in the same sentence. Stay accurate to the paper. Do not add textbook background the paper does not need. analysisMarkdown must be "".
${pasted}`;
    case "analysis":
      return `Assess the paper.
strengths: specific strengths supported by the paper. Each item needs a citation quote.
authorLimitations: limitations the authors themselves acknowledge. Quote them. If they do not discuss limitations, return an empty array. Do not put your own critiques here.
paperlyAnalysis: your analysis of weaknesses, assumptions, missing comparisons, or overclaimed conclusions. Phrase them as analysis. Include a citation when you are judging a specific passage. If you are pointing out an omission, citations may be an empty array and the text must say the paper does not address that point.
Do not present a judgment as something the authors stated.
${pasted}`;
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

export function chatInstruction(source: PaperSource): string {
  const pasted =
    source === "text"
      ? "This document was pasted. Every citation uses page 1. Put a section name in label when one is visible."
      : "Cite the page the quote comes from.";
  return `Answer the reader's question about this paper.
Put what the paper says in answerMarkdown. Put hypotheticals, extrapolation, and your own judgment in analysisMarkdown. If you have no analysis, set analysisMarkdown to "".
If the question asks whether a method would work somewhere else, keep the paper's facts and your speculation in those two fields.
${pasted}`;
}

export function parseArtifact(value: unknown): Artifact | null {
  const parsed = artifactSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseMessages(value: unknown): ChatMessage[] {
  const parsed = z.array(messageSchema).safeParse(value);
  return parsed.success ? parsed.data : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new PaperlyError("The model returned an unreadable answer.", 502);
}

export function readCoverage(value: unknown): Coverage {
  if (value === "grounded" || value === "partial" || value === "not_in_paper") return value;
  return "partial";
}

function isInsightKey(value: string): value is InsightKey {
  return (INSIGHT_KEYS as readonly string[]).includes(value);
}

export function readCitation(value: unknown): Citation | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const page = Number(record.page);
  const quote = typeof record.quote === "string" ? record.quote.trim() : "";
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (!Number.isInteger(page) || page < 1 || !quote) return null;
  return { page, quote, label: label ? label.slice(0, 80) : null };
}

export function readCitations(value: unknown): Citation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const citation = readCitation(item);
    return citation ? [citation] : [];
  });
}

export type ModelAnswer = {
  answerMarkdown: string;
  analysisMarkdown: string | null;
  citations: Citation[];
  coverage: Coverage;
};

export function readModelAnswer(value: unknown): ModelAnswer {
  const record = asRecord(value);
  const answerMarkdown = typeof record.answerMarkdown === "string" ? record.answerMarkdown.trim() : "";
  const analysisRaw = typeof record.analysisMarkdown === "string" ? record.analysisMarkdown.trim() : "";
  return {
    answerMarkdown: answerMarkdown || "Not stated in this paper.",
    analysisMarkdown: analysisRaw || null,
    citations: readCitations(record.citations),
    coverage: readCoverage(record.coverage),
  };
}

export function readModelInsights(value: unknown): {
  cards: { key: InsightKey; body: string; citations: Citation[] }[];
  coverage: Coverage;
} {
  const record = asRecord(value);
  const grouped = new Map<InsightKey, Citation[]>();
  for (const key of INSIGHT_KEYS) grouped.set(key, []);

  if (Array.isArray(record.citations)) {
    for (const item of record.citations) {
      if (typeof item !== "object" || item === null) continue;
      const field = (item as { field?: unknown }).field;
      const citation = readCitation(item);
      if (typeof field !== "string" || !isInsightKey(field) || !citation) continue;
      grouped.get(field)?.push(citation);
    }
  }

  return {
    coverage: readCoverage(record.coverage),
    cards: INSIGHT_KEYS.map((key) => {
      const body = record[key];
      return {
        key,
        body: typeof body === "string" && body.trim() ? body.trim() : "Not stated in this paper.",
        citations: grouped.get(key) ?? [],
      };
    }),
  };
}

export type ModelAnalysis = {
  strengths: { text: string; citations: Citation[] }[];
  authorLimitations: { text: string; citations: Citation[] }[];
  paperlyAnalysis: { text: string; citations: Citation[] }[];
  coverage: Coverage;
};

function readItems(value: unknown): { text: string; citations: Citation[] }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Record<string, unknown>;
    const text = typeof record.text === "string" ? record.text.trim() : "";
    if (!text) return [];
    return [{ text, citations: readCitations(record.citations) }];
  });
}

export function readModelAnalysis(value: unknown): ModelAnalysis {
  const record = asRecord(value);
  return {
    strengths: readItems(record.strengths),
    authorLimitations: readItems(record.authorLimitations),
    paperlyAnalysis: readItems(record.paperlyAnalysis),
    coverage: readCoverage(record.coverage),
  };
}

export type ModelMetadata = {
  title: string | null;
  authors: string[];
  year: number | null;
  abstract: string | null;
};

export function readModelMetadata(value: unknown): ModelMetadata {
  const record = asRecord(value);
  const title = typeof record.title === "string" ? record.title.trim() : "";
  const abstract = typeof record.abstract === "string" ? record.abstract.trim() : "";
  const year = Number(record.year);
  const authors = Array.isArray(record.authors)
    ? record.authors.flatMap((author) => {
        if (typeof author !== "string") return [];
        const name = author.trim();
        return name ? [name] : [];
      })
    : [];
  return {
    title: title || null,
    authors,
    year: Number.isInteger(year) && year > 1900 && year < 2100 ? year : null,
    abstract: abstract || null,
  };
}
