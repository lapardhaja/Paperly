import { z } from "zod";

import { PaperlyError } from "@/lib/errors";
import { clampWords, defaultWordsForKind, isSummaryKind, MISSING_LINE } from "@/lib/format";
import { INSIGHT_KEYS, SUMMARY_TONES, type Artifact, type ArtifactKind, type ChatMessage, type Citation, type Coverage, type InsightKey, type PaperSource, type SummaryArtifact, type SummarySettings, type SummaryTone } from "@/lib/types";

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
  model: z.string().nullable().default(null),
});

function summarySchema(kind: SummaryArtifact["kind"]) {
  return z.object({
    kind: z.literal(kind),
    answer: groundedSchema,
    words: z.number().int().positive().max(5000).optional(),
    tone: z.enum(SUMMARY_TONES).optional(),
    focus: z.string().optional().default(""),
    createdAt: z.string(),
    model: z.string().nullable().default(null),
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
  model: z.string().nullable().default(null),
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
  model: z.string().nullable().default(null),
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

export const SYSTEM_PROMPT = `You are Paperly, an advanced AI PDF summarization, handwritten document digitization, and document intelligence engine. Convert the provided document into structured intelligence with zero hallucination and explicit page citations.

STRICT SOURCE GROUNDING
- Base every summary, analysis, fact, and answer strictly on the PAPER text, tables, visual descriptions, and OCR content in this request.
- Do not extrapolate. Do not introduce external assumptions as facts. Earlier messages are not evidence.
- Do not invent numbers, datasets, methods, baselines, results, limitations, sections, figures, authors, or citations.
- If a requested answer or topic is absent, write exactly: "${MISSING_LINE}"
- Set coverage to "not_in_paper" when you cannot answer, or "partial" when you can answer only part.
- When only some pages are included, do not treat the missing pages as empty.

HANDWRITTEN AND OCR
- When pages are scanned or handwritten, digitize the handwriting, equations, and marginalia into Markdown and LaTeX before you summarize them.
- Label each digitized handwritten element exactly: [Handwritten Note on Page X: "..."].
- Inline math uses single dollar signs, for example $\\frac{2}{3}$. Display equations use double dollar signs.

CITATION TRACEABILITY
- Every key claim, metric, finding, or quote in the prose ends with [Page X] or [Pages X-Y].
- Also fill the citations array. quote must be copied verbatim from one page of the PAPER text, a full clause or sentence. page is that page number. label is a short locator such as "Results" or "Table 2" when the surrounding text supports it, otherwise "".
- Do not cite a page you cannot quote.
- Paper facts stay separate from your own reasoning. Never write a judgment as if the authors stated it.`;

export function retrievalQuery(kind: ArtifactKind): string {
  switch (kind) {
    case "insights":
      return "research question contribution method dataset findings limitations results conclusion";
    case "summary-quick":
      return "abstract introduction conclusion contribution findings";
    case "summary-detailed":
      return "research question motivation methodology data results conclusions tables limitations";
    case "summary-executive":
      return "findings contribution results conclusion risk cost";
    case "summary-eli5":
      return "section method results discussion conclusion tables figures limitations handwritten";
    case "analysis":
      return "limitations discussion method results assumptions baselines";
    default: {
      const unreachable: never = kind;
      return unreachable;
    }
  }
}

function toneInstruction(tone: SummaryTone): string {
  switch (tone) {
    case "academic":
    case "technical":
      return "Tone: Academic/Technical. Use precise terminology, keep the methodology, and stay analytically dense.";
    case "executive":
      return "Tone: C-Suite / Executive. Lead with outcomes, cost, and risk in actionable language. Stay inside the document.";
    case "simplified":
    case "plain":
    case "conversational":
      return "Tone: Simplified / Layperson. Use clear language without jargon. Define a necessary term in the same sentence. Do not add outside background.";
    default: {
      const unreachable: never = tone;
      return unreachable;
    }
  }
}

function outputArchitecture(kind: ArtifactKind, settings?: SummarySettings): string {
  if (!isSummaryKind(kind)) return "";
  const resolved = settings ?? {
    words: defaultWordsForKind(kind),
    tone: "academic" as const,
    focus: "",
  };
  const questions = resolved.focus.trim();
  const questionBlock = questions
    ? `The user provided questions. Answer them first under "## Answers to User Specific Questions". Format each as "- **Q:** ..." then "  - **A:** ..." with a page citation. If a question is not in the document, the answer is exactly: "${MISSING_LINE}"\n\nUSER QUESTIONS\n${questions}`
    : `The user did not provide a question. Omit "## Answers to User Specific Questions".`;
  const depth =
    kind === "summary-quick"
      ? "Length band: Brief. Keep Executive Overview, Key Takeaways, and Critical Appraisal tight. Add other sections only when the document has that material."
      : kind === "summary-eli5"
        ? "Length band: Comprehensive. Use every applicable section, with a deep section-by-section breakdown."
        : "Length band: Standard. Cover every applicable section in compact paragraphs.";

  return `${questionBlock}

Put the summary in answerMarkdown using this schema, in this order. Skip a section only when the document has nothing for it.
## Executive Overview
## Key Takeaways
- **[Core theme]:** finding. [Page X]
## Critical Appraisal (Pros, Cons & Methodological Analysis)
- **Strengths & Advantages:** ... [Page X]
- **Limitations & Disadvantages:** ... [Page Y]
## Digitized Handwritten & Marginalia Extracts
- **[Page X]:** digitized note or equation.
## Section-by-Section Breakdown
### [Section title]
## Key Metrics & Extracted Tables
- **[Metric]:** value (Source: Table/Chart on Page X)

analysisMarkdown must be "".
${depth}
${toneInstruction(resolved.tone)}
Length: about ${resolved.words} words. Stay within roughly 15 percent of that count. Heading lines do not count.`;
}

export function artifactInstruction(
  kind: ArtifactKind,
  source: PaperSource,
  settings?: SummarySettings,
): string {
  const pasted =
    source === "text"
      ? "This document was pasted. Every citation uses page 1. Put a section name in label when one is visible."
      : "";
  const architecture = outputArchitecture(kind, settings);

  switch (kind) {
    case "insights":
      return `Fill every field so a reader can scan it. Each field is one to three sentences and ends important claims with [Page X]. If the document does not state it, write "${MISSING_LINE}"
citations is an array. Each item's field is one of: researchQuestion, contribution, method, dataset, findings, limitations, numbers, conclusion. Only include a citation when you can quote that field from the document.
numbers lists important quantitative results that appear in the document, or "${MISSING_LINE}"
coverage is grounded when the main fields are supported, partial when several are missing, and not_in_paper only if the document does not support an overview.
${pasted}`;
    case "summary-quick":
    case "summary-detailed":
    case "summary-executive":
    case "summary-eli5":
      return `${architecture}
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
  return `Answer the reader's question about this document.
If the document does not contain the answer, set answerMarkdown to exactly "${MISSING_LINE}" and coverage to "not_in_paper".
Put what the document says in answerMarkdown. End every key claim with [Page X] or [Pages X-Y].
Put hypotheticals, extrapolation, and your own judgment in analysisMarkdown. If you have no analysis, set analysisMarkdown to "".
If the question asks whether a method would work somewhere else, keep the document's facts and your speculation in those two fields.
${pasted}`;
}

function countWords(markdown: string): number {
  const text = markdown
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$[^$\n]+\$/g, " ")
    .replace(/[#>*_`~[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return 0;
  return text.split(" ").length;
}

export function parseArtifact(value: unknown): Artifact | null {
  const parsed = artifactSchema.safeParse(value);
  if (!parsed.success) return null;
  const artifact = parsed.data;
  switch (artifact.kind) {
    case "insights":
    case "analysis":
      return artifact;
    case "summary-quick":
    case "summary-detailed":
    case "summary-executive":
    case "summary-eli5":
      return {
        ...artifact,
        words:
          artifact.words ??
          clampWords(countWords(artifact.answer.answerMarkdown), defaultWordsForKind(artifact.kind)),
        tone: artifact.tone ?? "academic",
        focus: artifact.focus ?? "",
      };
    default: {
      const unreachable: never = artifact;
      return unreachable;
    }
  }
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
    answerMarkdown: answerMarkdown || MISSING_LINE,
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
        body: typeof body === "string" && body.trim() ? body.trim() : MISSING_LINE,
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
