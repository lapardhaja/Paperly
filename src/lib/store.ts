import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { PaperlyError } from "@/lib/errors";
import type {
  Artifact,
  ArtifactKind,
  ArtifactMap,
  ChatMessage,
  PageText,
  Paper,
} from "@/lib/types";
import { parseArtifact, parseMessages } from "@/lib/ground";

const ROOT = path.join(process.cwd(), "data", "papers");

const ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const geminiFileSchema = z.object({
  name: z.string().min(1),
  uri: z.string().min(1),
  expiresAt: z.string().min(1),
});

const paperSchema = z.object({
  id: z.string().regex(ID_RE),
  source: z.enum(["pdf", "text"]),
  filename: z.string().nullable(),
  title: z.string().nullable(),
  authors: z.array(z.string()),
  year: z.number().int().nullable(),
  abstract: z.string().nullable(),
  pageCount: z.number().int().positive(),
  createdAt: z.string(),
  textQuality: z.enum(["ok", "low"]),
  geminiFile: geminiFileSchema.nullable(),
});

const pagesSchema = z.array(
  z.object({
    pageNumber: z.number().int().positive(),
    text: z.string(),
  }),
);

const ARTIFACT_KINDS: readonly ArtifactKind[] = [
  "insights",
  "summary-quick",
  "summary-detailed",
  "summary-executive",
  "summary-eli5",
  "analysis",
];

function paperDir(id: string): string {
  if (!ID_RE.test(id)) throw new PaperlyError("Unknown paper.", 404);
  const dir = path.resolve(ROOT, id);
  const root = path.resolve(ROOT);
  if (dir !== root && !dir.startsWith(root + path.sep)) {
    throw new PaperlyError("Unknown paper.", 404);
  }
  return dir;
}

async function exists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function readJson(file: string): Promise<unknown> {
  const raw = await readFile(file, "utf8");
  return JSON.parse(raw) as unknown;
}

function isArtifactKind(value: string): value is ArtifactKind {
  return (ARTIFACT_KINDS as readonly string[]).includes(value);
}

export function assertArtifactKind(value: unknown): ArtifactKind {
  if (typeof value === "string" && isArtifactKind(value)) return value;
  throw new PaperlyError("Unknown request.");
}

export async function getPaper(id: string): Promise<Paper | null> {
  let dir: string;
  try {
    dir = paperDir(id);
  } catch (error) {
    if (error instanceof PaperlyError) return null;
    throw error;
  }
  const file = path.join(dir, "paper.json");
  if (!(await exists(file))) return null;
  const parsed = paperSchema.safeParse(await readJson(file));
  return parsed.success ? parsed.data : null;
}

export async function requirePaper(id: string): Promise<Paper> {
  const paper = await getPaper(id);
  if (!paper) throw new PaperlyError("Unknown paper.", 404);
  return paper;
}

export async function readPages(id: string): Promise<PageText[]> {
  const file = path.join(paperDir(id), "pages.json");
  if (!(await exists(file))) throw new PaperlyError("That paper has no text.", 404);
  const parsed = pagesSchema.safeParse(await readJson(file));
  if (!parsed.success) throw new PaperlyError("That paper's text could not be read.", 500);
  return parsed.data;
}

export function pdfFilePath(id: string): string {
  return path.join(paperDir(id), "original.pdf");
}

export async function readPdf(id: string): Promise<Buffer | null> {
  const file = pdfFilePath(id);
  if (!(await exists(file))) return null;
  return readFile(file);
}

export async function createPaper(input: {
  paper: Paper;
  pages: PageText[];
  pdf: Uint8Array | null;
}): Promise<void> {
  const dir = paperDir(input.paper.id);
  await mkdir(path.join(dir, "artifacts"), { recursive: true });
  if (input.pdf) {
    await writeFile(path.join(dir, "original.pdf"), input.pdf);
  }
  await writeFile(
    path.join(dir, "pages.json"),
    JSON.stringify(pagesSchema.parse(input.pages), null, 2),
  );
  await writeFile(
    path.join(dir, "messages.json"),
    JSON.stringify([], null, 2),
  );
  await writeFile(
    path.join(dir, "paper.json"),
    JSON.stringify(paperSchema.parse(input.paper), null, 2),
  );
}

export async function updatePaper(
  id: string,
  patch: Partial<Omit<Paper, "id" | "createdAt" | "source">>,
): Promise<Paper> {
  const current = await requirePaper(id);
  const next = paperSchema.parse({
    ...current,
    ...patch,
    id: current.id,
    createdAt: current.createdAt,
    source: current.source,
  });
  await writeFile(path.join(paperDir(id), "paper.json"), JSON.stringify(next, null, 2));
  return next;
}

export async function readMessages(id: string): Promise<ChatMessage[]> {
  const file = path.join(paperDir(id), "messages.json");
  if (!(await exists(file))) return [];
  return parseMessages(await readJson(file));
}

export async function writeMessages(id: string, messages: ChatMessage[]): Promise<void> {
  await writeFile(
    path.join(paperDir(id), "messages.json"),
    JSON.stringify(messages, null, 2),
  );
}

export async function readArtifact(
  id: string,
  kind: ArtifactKind,
): Promise<Artifact | null> {
  const file = path.join(paperDir(id), "artifacts", `${kind}.json`);
  if (!(await exists(file))) return null;
  return parseArtifact(await readJson(file));
}

export async function writeArtifact(id: string, artifact: Artifact): Promise<void> {
  const dir = path.join(paperDir(id), "artifacts");
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, `${artifact.kind}.json`),
    JSON.stringify(artifact, null, 2),
  );
}

export async function readAllArtifacts(id: string): Promise<ArtifactMap> {
  const map: ArtifactMap = {};
  for (const kind of ARTIFACT_KINDS) {
    const artifact = await readArtifact(id, kind);
    if (artifact) map[kind] = artifact;
  }
  return map;
}
