"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AnalysisView } from "@/components/AnalysisView";
import { AskBar } from "@/components/AskBar";
import { ChatThread } from "@/components/ChatThread";
import { InsightsGrid } from "@/components/InsightsGrid";
import { PaperHeader } from "@/components/PaperHeader";
import { PdfDrawer } from "@/components/PdfDrawer";
import { SummaryView } from "@/components/SummaryView";
import { parseTab, summaryKind } from "@/lib/format";
import type {
  AnalysisArtifact,
  Artifact,
  ArtifactKind,
  ArtifactMap,
  ChatMessage,
  InsightsArtifact,
  Paper,
  SummaryMode,
  WorkspaceTab,
} from "@/lib/types";

function isInsights(artifact: Artifact | undefined): artifact is InsightsArtifact {
  return artifact?.kind === "insights";
}

function isAnalysis(artifact: Artifact | undefined): artifact is AnalysisArtifact {
  return artifact?.kind === "analysis";
}

export function Workspace({
  paper,
  initialMessages,
  initialArtifacts,
}: {
  paper: Paper;
  initialMessages: ChatMessage[];
  initialArtifacts: ArtifactMap;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseTab(searchParams.get("tab") ?? undefined);
  const [messages, setMessages] = useState(initialMessages);
  const [artifacts, setArtifacts] = useState(initialArtifacts);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<ArtifactKind | "chat" | null>(null);
  const [summaryMode, setSummaryMode] = useState<SummaryMode | null>(null);
  const [drawer, setDrawer] = useState<{ open: boolean; page: number }>({ open: false, page: 1 });
  const insightsRequested = useRef(Boolean(initialArtifacts.insights));

  function setTab(next: WorkspaceTab) {
    setError(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function openPage(page: number) {
    if (paper.source !== "pdf") return;
    setDrawer({ open: true, page });
  }

  async function generate(kind: ArtifactKind) {
    setPending(kind);
    setError(null);
    const response = await fetch(`/api/papers/${paper.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = (await response.json()) as { artifact?: Artifact; error?: string };
    setPending(null);
    if (!response.ok || !data.artifact) {
      if (kind === "insights") insightsRequested.current = false;
      setError(data.error ?? "Could not read this paper.");
      return;
    }
    setArtifacts((current) => ({ ...current, [kind]: data.artifact }));
  }

  useEffect(() => {
    if (tab !== "overview" || insightsRequested.current) return;
    insightsRequested.current = true;
    void generate("insights");
    // generate closes over paper.id, which is stable for this page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, paper.id]);

  async function ask(question: string) {
    setTab("chat");
    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      answer: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setPending("chat");
    setError(null);
    const response = await fetch(`/api/papers/${paper.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question }),
    });
    const data = (await response.json()) as {
      user?: ChatMessage;
      assistant?: ChatMessage;
      error?: string;
    };
    setPending(null);
    if (!response.ok || !data.user || !data.assistant) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(data.error ?? "Could not answer that.");
      return;
    }
    setMessages((current) => [
      ...current.filter((message) => message.id !== optimistic.id),
      data.user as ChatMessage,
      data.assistant as ChatMessage,
    ]);
  }

  function chooseSummary(mode: SummaryMode) {
    setSummaryMode(mode);
    const kind = summaryKind(mode);
    if (!artifacts[kind]) void generate(kind);
  }

  const insights = isInsights(artifacts.insights) ? artifacts.insights : null;
  const analysis = isAnalysis(artifacts.analysis) ? artifacts.analysis : null;

  return (
    <div className={drawer.open ? "sm:pr-[440px]" : ""}>
      <PaperHeader paper={paper} tab={tab} onTab={setTab} onViewPdf={() => openPage(drawer.page || 1)} />
      <main className="mx-auto w-full max-w-3xl px-5 pt-8 pb-32">
        {paper.textQuality === "low" ? (
          <p className="mb-6 rounded-2xl bg-accent-soft px-4 py-3 text-sm leading-6 text-ink">
            This PDF has very little extractable text, so it may be scanned. Paperly will send the
            PDF itself to Gemini, and page citations will only appear when a quote can be checked.
          </p>
        ) : null}
        {paper.abstract && tab === "overview" ? (
          <p className="mb-8 text-[15px] leading-7 text-muted">{paper.abstract}</p>
        ) : null}
        {error ? <p className="mb-6 text-sm text-warn">{error}</p> : null}
        {tab === "overview" && !insights && pending !== "insights" && error ? (
          <button
            type="button"
            onClick={() => void generate("insights")}
            className="mb-6 cursor-pointer text-sm text-accent"
          >
            Try again
          </button>
        ) : null}
        {tab === "overview" ? (
          <InsightsGrid
            artifact={insights}
            source={paper.source}
            loading={pending === "insights"}
            onOpenPage={openPage}
          />
        ) : null}
        {tab === "summary" ? (
          <SummaryView
            artifacts={artifacts}
            mode={summaryMode}
            source={paper.source}
            loading={pending?.startsWith("summary-") ?? false}
            onMode={chooseSummary}
            onOpenPage={openPage}
          />
        ) : null}
        {tab === "analysis" ? (
          <AnalysisView
            artifact={analysis}
            source={paper.source}
            loading={pending === "analysis"}
            onGenerate={() => void generate("analysis")}
            onOpenPage={openPage}
          />
        ) : null}
        {tab === "chat" ? (
          <ChatThread
            messages={messages}
            source={paper.source}
            pending={pending === "chat"}
            onOpenPage={openPage}
          />
        ) : null}
      </main>
      <AskBar disabled={pending !== null} drawerOpen={drawer.open} onAsk={(question) => void ask(question)} />
      {drawer.open && paper.source === "pdf" ? (
        <PdfDrawer
          paperId={paper.id}
          pageCount={paper.pageCount}
          page={drawer.page}
          onPage={(page) => setDrawer({ open: true, page })}
          onClose={() => setDrawer((current) => ({ ...current, open: false }))}
        />
      ) : null}
    </div>
  );
}
