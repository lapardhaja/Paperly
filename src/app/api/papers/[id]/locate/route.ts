import { bestHighlight, findQuotePage } from "@/lib/citations";
import { errorResponse } from "@/lib/http";
import { readPages } from "@/lib/store";

export const runtime = "nodejs";

function preferredPages(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const pages: number[] = [];
  for (const item of value) {
    if (typeof item === "number" && Number.isInteger(item) && item > 0 && item <= 1000) pages.push(item);
    if (pages.length === 12) break;
  }
  return pages;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { quote?: unknown; pages?: unknown };
    const quote = typeof body.quote === "string" ? body.quote.trim() : "";
    if (quote.length < 12 || quote.length > 800) return Response.json({ page: null, highlight: null });
    const stored = await readPages(id);
    const preferred = preferredPages(body.pages);
    if (preferred.length === 0) {
      const exact = findQuotePage(stored, quote);
      if (exact) return Response.json({ page: exact, highlight: quote });
    }
    const hit = bestHighlight(stored, quote, preferred);
    if (!hit) return Response.json({ page: null, highlight: null });
    return Response.json({ page: hit.page, highlight: hit.quote });
  } catch (error) {
    return errorResponse(error);
  }
}
