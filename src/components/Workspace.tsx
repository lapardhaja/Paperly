"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from "react";

import { AnalysisView } from "@/components/AnalysisView";
import { AskBar } from "@/components/AskBar";
import { ChatThread } from "@/components/ChatThread";
import { InsightsGrid } from "@/components/InsightsGrid";
import { PaperHeader } from "@/components/PaperHeader";
import { PdfDrawer } from "@/components/PdfDrawer";
import { SummaryView } from "@/components/SummaryView";
import { isSummaryArtifact, parseTab, summaryKind } from "@/lib/format";
import type {
  AnalysisArtifact,
  Artifact,
  ArtifactKind,
  ArtifactMap,
  ChatMessage,
  InsightsArtifact,
  OpenPage,
  Paper,
  SummaryMode,
  SummarySettings,
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
  const [drawer, setDrawer] = useState<{ open: boolean; page: number; quote?: string }>({
    open: false,
    page: 1,
  });
  const [drawerWidth, setDrawerWidth] = useState(880);
  const [hint, setHint] = useState<string | null>(null);
  const insightsRequested = useRef(Boolean(initialArtifacts.insights));
  const hoverTimer = useRef<number | null>(null);
  const locateSeq = useRef(0);

  useEffect(() => {
    return () => {
      if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    };
  }, []);

  function setTab(next: WorkspaceTab) {
    setError(null);
    setHint(null);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const openPage: OpenPage = (page, quote) => {
    if (paper.source !== "pdf") return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    setHint(null);
    setDrawer({ open: true, page, quote });
  };

  const previewPage: OpenPage = (page, quote) => {
    if (paper.source !== "pdf") return;
    if (hoverTimer.current !== null) window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => {
      setHint(null);
      setDrawer({ open: true, page, quote });
    }, 180);
  };

  async function generate(kind: ArtifactKind, request?: { settings: SummarySettings; force: boolean }) {
    setPending(kind);
    setError(null);
    const response = await fetch(`/api/papers/${paper.id}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        request
          ? { kind, words: request.settings.words, tone: request.settings.tone, force: request.force }
          : { kind },
      ),
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
      model: null,
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

  function writeSummary(mode: SummaryMode, settings: SummarySettings, force: boolean) {
    setSummaryMode(mode);
    const kind = summaryKind(mode);
    const existing = artifacts[kind];
    if (!force && existing && isSummaryArtifact(existing)) return;
    void generate(kind, { settings, force });
  }

  async function locateQuote(quote: string) {
    const seq = locateSeq.current + 1;
    locateSeq.current = seq;
    const response = await fetch(`/api/papers/${paper.id}/locate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quote }),
    });
    if (seq !== locateSeq.current) return;
    const data = (await response.json()) as { page?: number | null; error?: string };
    if (!response.ok) {
      setHint(data.error ?? "Could not search the paper.");
      return;
    }
    if (!data.page) {
      setHint("That selection is not in the extracted text.");
      return;
    }
    openPage(data.page, quote);
  }

  function onSourceMouseUp(event: ReactMouseEvent<HTMLElement>) {
    if (paper.source !== "pdf") return;
    const target = event.target;
    if (!(target instanceof Element) || target.closest("button, a, input, textarea, select")) return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;
    const node = selection.anchorNode;
    const element = node instanceof Element ? node : node?.parentElement;
    if (!element?.closest("[data-paper-source]")) return;
    const text = selection.toString().replace(/\s+/g, " ").trim();
    if (text.length < 16) return;
    void locateQuote(text.slice(0, 500));
  }

  const insights = isInsights(artifacts.insights) ? artifacts.insights : null;
  const analysis = isAnalysis(artifacts.analysis) ? artifacts.analysis : null;
  const activeModel = ((): string | null => {
    switch (tab) {
      case "overview":
        return insights?.model ?? null;
      case "analysis":
        return analysis?.model ?? null;
      case "summary": {
        if (!summaryMode) return null;
        const artifact = artifacts[summaryKind(summaryMode)];
        return artifact && isSummaryArtifact(artifact) ? artifact.model : null;
      }
      case "chat": {
        for (let index = messages.length - 1; index >= 0; index -= 1) {
          const message = messages[index];
          if (message?.model) return message.model;
        }
        return null;
      }
      default: {
        const unreachable: never = tab;
        return unreachable;
      }
    }
  })();

  return (
    <div
      className={drawer.open ? "sm:pr-[var(--drawer-w)]" : ""}
      style={{ "--drawer-w": `min(${drawerWidth}px, calc(100vw - 280px))` } as CSSProperties}
    >
      <PaperHeader
        paper={paper}
        tab={tab}
        model={activeModel}
        onTab={setTab}
        onViewPdf={() => openPage(drawer.page || 1)}
      />
      <main className="mx-auto w-full min-w-0 max-w-3xl px-5 pt-8 pb-32" onMouseUp={onSourceMouseUp}>
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
        {hint ? <p className="mb-6 text-sm text-muted">{hint}</p> : null}
        {activeModel ? (
          <p className="mb-4 font-mono text-xs text-accent">Model {activeModel}</p>
        ) : null}
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
            activeQuote={drawer.quote}
            onOpenPage={openPage}
            onPreviewPage={previewPage}
          />
        ) : null}
        {tab === "summary" ? (
          <SummaryView
            artifacts={artifacts}
            mode={summaryMode}
            source={paper.source}
            loading={summaryMode ? pending === summaryKind(summaryMode) : false}
            activeQuote={drawer.quote}
            onWrite={writeSummary}
            onOpenPage={openPage}
            onPreviewPage={previewPage}
          />
        ) : null}
        {tab === "analysis" ? (
          <AnalysisView
            artifact={analysis}
            source={paper.source}
            loading={pending === "analysis"}
            activeQuote={drawer.quote}
            onGenerate={() => void generate("analysis")}
            onOpenPage={openPage}
            onPreviewPage={previewPage}
          />
        ) : null}
        {tab === "chat" ? (
          <ChatThread
            messages={messages}
            source={paper.source}
            pending={pending === "chat"}
            activeQuote={drawer.quote}
            onOpenPage={openPage}
            onPreviewPage={previewPage}
          />
        ) : null}
      </main>
      <AskBar disabled={pending !== null} drawerOpen={drawer.open} onAsk={(question) => void ask(question)} />
      {drawer.open && paper.source === "pdf" ? (
        <PdfDrawer
          paperId={paper.id}
          pageCount={paper.pageCount}
          page={drawer.page}
          quote={drawer.quote ?? ""}
          width={drawerWidth}
          onResize={setDrawerWidth}
          onPage={(page) => setDrawer({ open: true, page })}
          onClose={() => setDrawer((current) => ({ ...current, open: false }))}
        />
      ) : null}
    </div>
  );
}
