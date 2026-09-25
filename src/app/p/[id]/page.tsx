import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Workspace } from "@/components/Workspace";
import { readAllArtifacts, readMessages, getPaper } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const paper = await getPaper(id);
  return { title: paper?.title ? `${paper.title} · Paperly` : "Paperly" };
}

export default async function PaperPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const paper = await getPaper(id);
  if (!paper) notFound();
  const [messages, artifacts] = await Promise.all([readMessages(id), readAllArtifacts(id)]);

  return (
    <Workspace paper={paper} initialMessages={messages} initialArtifacts={artifacts} />
  );
}
