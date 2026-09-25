import { errorResponse } from "@/lib/http";
import { ingestPdf, ingestText } from "@/lib/ingest";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = (await request.json()) as { text?: unknown };
      if (typeof body.text !== "string") {
        return Response.json({ error: "Paste the paper text." }, { status: 400 });
      }
      const paper = await ingestText(body.text);
      return Response.json({ paper });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Choose a PDF." }, { status: 400 });
    }
    const paper = await ingestPdf(file);
    return Response.json({ paper });
  } catch (error) {
    return errorResponse(error);
  }
}
