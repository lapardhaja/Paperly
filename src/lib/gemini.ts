import {
  createPartFromUri,
  FileState,
  GoogleGenAI,
  PartMediaResolutionLevel,
  type Content,
  type Part,
} from "@google/genai";

import { PaperlyError } from "@/lib/errors";
import { pdfFilePath, requirePaper, updatePaper } from "@/lib/store";
import type { GeminiFileRef } from "@/lib/types";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function apiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new PaperlyError("Add GEMINI_API_KEY to .env and restart the dev server.");
  }
  return key;
}

const FALLBACK_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
] as const;

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || FALLBACK_MODELS[0];
}

function modelOrder(): string[] {
  const preferred = geminiModel();
  return [preferred, ...FALLBACK_MODELS.filter((model) => model !== preferred)];
}

type Overload = "quota" | "busy" | "missing";

function classify(error: unknown): Overload | null {
  if (typeof error !== "object" || error === null) return null;
  const record = error as { status?: number; message?: string };
  const message = record.message ?? "";
  if (record.status === 404 || /not found|is not supported|unknown model/i.test(message)) return "missing";
  if (
    record.status === 429 ||
    /RESOURCE_EXHAUSTED|quota exceeded|exceeded your current quota/i.test(message)
  ) {
    return "quota";
  }
  if (record.status === 503 || /UNAVAILABLE|high demand|overloaded/i.test(message)) return "busy";
  return null;
}

function client(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: apiKey() });
}

export function parseModelJson(text: string | undefined): unknown {
  if (!text?.trim()) {
    throw new PaperlyError("The model returned an empty answer.", 502);
  }
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    throw new PaperlyError("The model returned an unreadable answer.", 502);
  }
}

export async function generateJson(input: {
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  history?: { role: "user" | "assistant"; text: string }[];
  pdfUri?: string | null;
  maxOutputTokens?: number;
}): Promise<{ data: unknown; model: string }> {
  const ai = client();
  const contents: Content[] = [];

  for (const turn of input.history ?? []) {
    contents.push({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text || "(empty)" }],
    });
  }

  const parts: Part[] = [];
  if (input.pdfUri) {
    parts.push(
      createPartFromUri(
        input.pdfUri,
        "application/pdf",
        PartMediaResolutionLevel.MEDIA_RESOLUTION_MEDIUM,
      ),
    );
  }
  parts.push({ text: input.prompt });
  contents.push({ role: "user", parts });

  const config = {
    systemInstruction: input.system,
    temperature: 0.2,
    maxOutputTokens: input.maxOutputTokens ?? 8192,
    responseMimeType: "application/json",
    responseJsonSchema: input.schema,
  };
  let lastError: unknown;
  let sawQuota = false;
  let sawBusy = false;

  for (const [index, model] of modelOrder().entries()) {
    const attempts = index === 0 ? 2 : 1;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await ai.models.generateContent({ model, contents, config });
        if (model !== geminiModel()) {
          console.info(`Gemini ${geminiModel()} was unavailable. Answered with ${model}.`);
        }
        return { data: parseModelJson(response.text), model };
      } catch (error) {
        if (error instanceof PaperlyError) throw error;
        lastError = error;
        const kind = classify(error);
        if (!kind) {
          const message = error instanceof Error ? error.message : "Gemini request failed.";
          throw new PaperlyError(message.slice(0, 300), 502);
        }
        if (kind === "quota") sawQuota = true;
        if (kind === "busy") sawBusy = true;
        console.info(`Gemini ${model} skipped (${kind}).`);
        if (kind === "quota" || kind === "missing") break;
        if (attempt === 0 && attempts > 1) await sleep(800);
      }
    }
  }

  console.error(lastError);
  const message =
    sawQuota && sawBusy
      ? "Gemini 3.8 Flash is busy, and the other free Flash quotas are used up. Try again in a minute."
      : sawQuota
        ? "The free Gemini quota is used up for now. Try again in a minute."
        : "Gemini is busy right now, including the other Flash models. Wait a minute and try again.";
  throw new PaperlyError(message, 503);
}

export async function ensureGeminiFile(paperId: string): Promise<GeminiFileRef> {
  const paper = await requirePaper(paperId);
  if (paper.source !== "pdf") throw new PaperlyError("There is no PDF to attach.");
  if (paper.geminiFile && Date.parse(paper.geminiFile.expiresAt) > Date.now() + 60_000) {
    return paper.geminiFile;
  }

  const ai = client();
  let file = await ai.files.upload({
    file: pdfFilePath(paperId),
    config: { mimeType: "application/pdf" },
  });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (file.state === FileState.ACTIVE && file.uri && file.name) break;
    if (file.state === FileState.FAILED) {
      throw new PaperlyError(file.error?.message || "Gemini could not read that PDF.", 502);
    }
    if (!file.name) throw new PaperlyError("Gemini file upload did not return a name.", 502);
    await sleep(1000);
    file = await ai.files.get({ name: file.name });
  }

  if (!file.uri || !file.name || file.state === FileState.FAILED) {
    throw new PaperlyError("Gemini is still processing that PDF. Try again in a moment.", 502);
  }

  const ref: GeminiFileRef = {
    name: file.name,
    uri: file.uri,
    expiresAt: file.expirationTime ?? new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString(),
  };
  await updatePaper(paperId, { geminiFile: ref });
  return ref;
}
