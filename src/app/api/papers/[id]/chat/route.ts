import { askPaper } from "@/lib/answer";
import { errorResponse } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { message?: unknown };
    if (typeof body.message !== "string") {
      return Response.json({ error: "Ask a question about the paper." }, { status: 400 });
    }
    const result = await askPaper(id, body.message);
    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
