"use client";

import Link from "next/link";

import { BrandMark } from "@/components/BrandMark";
import { paperMetaLine, tabLabel } from "@/lib/format";
import type { Paper, WorkspaceTab } from "@/lib/types";

const TABS: WorkspaceTab[] = ["summary", "overview", "analysis", "chat"];

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
    <header className="sticky top-0 z-20 border-b border-line bg-surface/85 shadow-[0_8px_24px_rgba(21,40,71,0.05)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-ink">
          <BrandMark className="h-8 w-8" />
          <span className="font-serif text-base tracking-tight">Paperly</span>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-serif text-lg tracking-tight text-ink">{paper.title ?? "Untitled document"}</h1>
          <p className="truncate text-sm font-medium text-ink">{paperMetaLine(paper)}</p>
          {model ? <p className="truncate font-mono text-xs font-semibold text-ink">{model}</p> : null}
        </div>
        {paper.source === "pdf" ? (
          <button
            type="button"
            onClick={onViewPdf}
            className="btn-primary h-10 px-4 text-sm"
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
            className={`cursor-pointer border-b-2 px-3 py-2 text-sm font-semibold ${
              item === tab ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {tabLabel(item)}
          </button>
        ))}
      </nav>
    </header>
  );
}
