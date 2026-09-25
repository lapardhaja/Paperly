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

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3-flash-preview";
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
}): Promise<unknown> {
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

  try {
    const response = await ai.models.generateContent({
      model: geminiModel(),
      contents,
      config: {
        systemInstruction: input.system,
        temperature: 0.2,
        maxOutputTokens: input.maxOutputTokens ?? 8192,
        responseMimeType: "application/json",
        responseJsonSchema: input.schema,
      },
    });
    return parseModelJson(response.text);
  } catch (error) {
    if (error instanceof PaperlyError) throw error;
    console.error(error);
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    throw new PaperlyError(message.slice(0, 300), 502);
  }
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
