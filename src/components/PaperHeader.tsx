"use client";

import Link from "next/link";

import { paperMetaLine, tabLabel } from "@/lib/format";
import type { Paper, WorkspaceTab } from "@/lib/types";

const TABS: WorkspaceTab[] = ["overview", "summary", "analysis", "chat"];

export function PaperHeader({
  paper,
  tab,
  model,
  onTab,
  onViewPdf,
}: {
  paper: Paper;
  tab: WorkspaceTab;
  model: string | null;
  onTab: (tab: WorkspaceTab) => void;
  onViewPdf: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-4">
        <Link href="/" className="shrink-0 font-serif text-xl text-ink">
          Paperly
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-lg text-ink">{paper.title ?? "Untitled paper"}</h1>
          <p className="truncate text-sm text-muted">{paperMetaLine(paper)}</p>
          {model ? <p className="truncate font-mono text-xs text-accent">{model}</p> : null}
        </div>
        {paper.source === "pdf" ? (
          <button
            type="button"
            onClick={onViewPdf}
            className="h-10 shrink-0 cursor-pointer rounded-full border border-line bg-surface px-4 text-sm"
          >
            View PDF
          </button>
        ) : null}
      </div>
      <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onTab(item)}
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm ${
              item === tab ? "border-accent text-ink" : "border-transparent text-muted"
            }`}
          >
            {tabLabel(item)}
          </button>
        ))}
      </nav>
    </header>
  );
}
