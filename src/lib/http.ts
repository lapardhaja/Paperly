import { PaperlyError } from "@/lib/errors";

export function errorResponse(error: unknown): Response {
  if (error instanceof PaperlyError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
