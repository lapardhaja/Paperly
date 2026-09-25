import { findQuotePage } from "@/lib/citations";
import { errorResponse } from "@/lib/http";
import { readPages } from "@/lib/store";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { quote?: unknown };
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    if (quote.length < 12 || quote.length > 800) return Response.json({ page: null });
    const page = findQuotePage(await readPages(id), quote);
    return Response.json({ page });
  } catch (error) {
    return errorResponse(error);
  }
}
