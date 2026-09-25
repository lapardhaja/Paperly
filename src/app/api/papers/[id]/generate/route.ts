import { getOrCreateArtifact } from "@/lib/answer";
import { errorResponse } from "@/lib/http";
import { assertArtifactKind } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { kind?: unknown };
    const kind = assertArtifactKind(body.kind);
    const artifact = await getOrCreateArtifact(id, kind);
    return Response.json({ artifact });
  } catch (error) {
    return errorResponse(error);
  }
}
