import { getOrCreateArtifact } from "@/lib/answer";
import { clampWords, defaultWordsForKind, isSummaryKind, parseTone } from "@/lib/format";
import { errorResponse } from "@/lib/http";
import { assertArtifactKind } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      kind?: unknown;
      words?: unknown;
      tone?: unknown;
      force?: unknown;
    };
    const kind = assertArtifactKind(body.kind);
    const settings = isSummaryKind(kind)
      ? { words: clampWords(body.words, defaultWordsForKind(kind)), tone: parseTone(body.tone) }
      : undefined;
    const artifact = await getOrCreateArtifact(id, kind, {
      settings,
      force: body.force === true,
    });
    return Response.json({ artifact });
  } catch (error) {
    return errorResponse(error);
  }
}
