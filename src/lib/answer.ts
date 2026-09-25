import { verifyCitations } from "@/lib/citations";
import { PaperlyError } from "@/lib/errors";
import { ensureGeminiFile, generateJson } from "@/lib/gemini";
import {
  ANALYSIS_SCHEMA,
  ANSWER_SCHEMA,
  artifactInstruction,
  chatInstruction,
  INSIGHTS_SCHEMA,
  readModelAnalysis,
  readModelAnswer,
  readModelInsights,
  retrievalQuery,
  SYSTEM_PROMPT,
} from "@/lib/ground";
import { formatPaper, retrievePages, shouldAttachPdf } from "@/lib/retrieve";
import {
  readArtifact,
  readMessages,
  readPages,
  requirePaper,
  writeArtifact,
  writeMessages,
} from "@/lib/store";
import type {
  AnalysisItem,
  Artifact,
  ArtifactKind,
  ChatMessage,
  GroundedAnswer,
  PageText,
  Paper,
  Retrieval,
} from "@/lib/types";

const HISTORY_LIMIT = 12;
const OMISSION =
  /does not|doesn't|do not|don't|no discussion|not discuss|absent|missing|omit|without (a |an )?(limitation|comparison|baseline)/i;

function documentBlock(paper: Paper, retrieval: Retrieval): string {
  const notes = [
    `Title: ${paper.title ?? "Unknown"}`,
    `Pages included: ${retrieval.pages.map((page) => page.pageNumber).join(", ")}`,
    retrieval.truncated
      ? "This is a subset of a long document. Do not treat missing pages as empty."
      : "The full extracted text is included.",
    paper.source === "text" ? "Source: pasted text. Citations use page 1." : "",
    paper.textQuality === "low"
      ? "Extracted text is sparse. This PDF may be scanned. If a claim is only visible in the attached PDF and not in the PAPER text, say so and do not invent a quote."
      : "",
  ].filter(Boolean);

  return `${notes.join("\n")}\n\nPAPER\n\n${formatPaper(retrieval.pages)}`;
}

function withRetrieval(
  answer: Omit<GroundedAnswer, "pagesUsed" | "truncated">,
  retrieval: Retrieval,
): GroundedAnswer {
  return {
    ...answer,
    citations: verifyCitations(answer.citations, retrieval.pages),
    pagesUsed: retrieval.pages.map((page) => page.pageNumber),
    truncated: retrieval.truncated,
  };
}

function verifyItems(items: AnalysisItem[], pages: PageText[]): AnalysisItem[] {
  return items.map((item) => ({
    text: item.text,
    citations: verifyCitations(item.citations, pages),
  }));
}

function keepQuoted(items: AnalysisItem[]): AnalysisItem[] {
  return items.filter((item) => item.text.trim() && item.citations.length > 0);
}

function keepPaperly(items: AnalysisItem[]): AnalysisItem[] {
  return items.filter((item) => {
    if (!item.text.trim()) return false;
    if (item.citations.length > 0) return true;
    return OMISSION.test(item.text);
  });
}

async function attachPdf(paper: Paper, question?: string): Promise<string | null> {
  const needed = shouldAttachPdf({ textQuality: paper.textQuality, question });
  if (!needed || paper.source !== "pdf") return null;
  try {
    const file = await ensureGeminiFile(paper.id);
    return file.uri;
  } catch (error) {
    if (paper.textQuality === "low") throw error;
    console.error(error);
    return null;
  }
}

export async function getOrCreateArtifact(id: string, kind: ArtifactKind): Promise<Artifact> {
  const cached = await readArtifact(id, kind);
  if (cached) return cached;

  const paper = await requirePaper(id);
  const pages = await readPages(id);
  const retrieval = retrievePages(pages, retrievalQuery(kind));
  const prompt = `${artifactInstruction(kind, paper.source)}\n\n${documentBlock(paper, retrieval)}`;
  const pdfUri = await attachPdf(paper);
  const createdAt = new Date().toISOString();

  if (kind === "insights") {
    const raw = await generateJson({
      system: SYSTEM_PROMPT,
      prompt,
      schema: INSIGHTS_SCHEMA,
      pdfUri,
    });
    const model = readModelInsights(raw);
    const artifact: Artifact = {
      kind: "insights",
      coverage: model.coverage,
      pagesUsed: retrieval.pages.map((page) => page.pageNumber),
      truncated: retrieval.truncated,
      createdAt,
      cards: model.cards.map((card) => ({
        ...card,
        citations: verifyCitations(card.citations, retrieval.pages),
      })),
    };
    await writeArtifact(id, artifact);
    return artifact;
  }

  if (kind === "analysis") {
    const raw = await generateJson({
      system: SYSTEM_PROMPT,
      prompt,
      schema: ANALYSIS_SCHEMA,
      pdfUri,
    });
    const model = readModelAnalysis(raw);
    const verified = {
      strengths: verifyItems(model.strengths, retrieval.pages),
      authorLimitations: verifyItems(model.authorLimitations, retrieval.pages),
      paperlyAnalysis: verifyItems(model.paperlyAnalysis, retrieval.pages),
    };
    const artifact: Artifact = {
      kind: "analysis",
      coverage: model.coverage,
      pagesUsed: retrieval.pages.map((page) => page.pageNumber),
      truncated: retrieval.truncated,
      createdAt,
      strengths: keepQuoted(verified.strengths),
      authorLimitations: keepQuoted(verified.authorLimitations),
      paperlyAnalysis: keepPaperly(verified.paperlyAnalysis),
    };
    await writeArtifact(id, artifact);
    return artifact;
  }

  const raw = await generateJson({
    system: SYSTEM_PROMPT,
    prompt,
    schema: ANSWER_SCHEMA,
    pdfUri,
  });
  const artifact: Artifact = {
    kind,
    createdAt,
    answer: withRetrieval(readModelAnswer(raw), retrieval),
  };
  await writeArtifact(id, artifact);
  return artifact;
}

function historyText(message: ChatMessage): string {
  if (message.role === "user") return message.content;
  const answer = message.answer;
  if (!answer) return message.content;
  if (!answer.analysisMarkdown) return answer.answerMarkdown;
  return `${answer.answerMarkdown}\n\nPaperly's analysis (not a statement from the paper): ${answer.analysisMarkdown}`;
}

function recentHistory(messages: ChatMessage[]): { role: "user" | "assistant"; text: string }[] {
  const slice = messages.slice(-HISTORY_LIMIT);
  while (slice.length > 0 && slice[0]?.role !== "user") slice.shift();
  return slice.map((message) => ({
    role: message.role,
    text: historyText(message),
  }));
}

export async function askPaper(
  id: string,
  question: string,
): Promise<{ user: ChatMessage; assistant: ChatMessage }> {
  const trimmed = question.trim();
  if (!trimmed) throw new PaperlyError("Ask a question about the paper.");
  if (trimmed.length > 4000) throw new PaperlyError("That question is too long.");

  const paper = await requirePaper(id);
  const pages = await readPages(id);
  const prior = await readMessages(id);
  const retrieval = retrievePages(pages, trimmed);
  const pdfUri = await attachPdf(paper, trimmed);
  const raw = await generateJson({
    system: SYSTEM_PROMPT,
    prompt: `${chatInstruction(paper.source)}\n\n${documentBlock(paper, retrieval)}\n\nQUESTION\n${trimmed}`,
    schema: ANSWER_SCHEMA,
    history: recentHistory(prior),
    pdfUri,
  });

  const now = new Date().toISOString();
  const user: ChatMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content: trimmed,
    answer: null,
    createdAt: now,
  };
  const assistant: ChatMessage = {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "",
    answer: withRetrieval(readModelAnswer(raw), retrieval),
    createdAt: new Date().toISOString(),
  };
  assistant.content = assistant.answer?.answerMarkdown ?? "";
  await writeMessages(id, [...prior, user, assistant]);
  return { user, assistant };
}
