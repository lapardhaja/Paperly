import { Children, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

import type { Citation, OpenPage, PaperSource } from "@/lib/types";

const PAGE_CITE = /\[(?:Page|Pages)\s+\d+(?:\s*(?:[–-]|,)\s*\d+)*\]/gi;

export type LocateClaim = (pages: number[], claim: string, preview: boolean) => void;

function pagesInCite(label: string): number[] {
  const body = label.replace(/^\[(?:Page|Pages)\s+/i, "").replace(/\]$/, "");
  const pages = new Set<number>();
  for (const part of body.split(",")) {
    const range = part.trim().match(/^(\d+)\s*[–-]\s*(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      const low = Math.min(start, end);
      const high = Math.max(start, end);
      for (let page = low; page <= high && page - low < 40; page += 1) pages.add(page);
      continue;
    }
    const single = part.trim().match(/^(\d+)$/);
    if (single) pages.add(Number(single[1]));
  }
  return [...pages].sort((left, right) => left - right);
}

function quotesOnPage(citations: Citation[], page: number): string[] {
  return citations.filter((citation) => citation.page === page).map((citation) => citation.quote);
}

function textOf(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((child) => textOf(child)).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

function claimBefore(paragraph: string, at: number): string {
  const line = (paragraph.slice(Math.max(0, at - 500), at).split("\n").pop() ?? "")
    .replace(/\s+/g, " ")
    .replace(/^#+\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();
  const parts = line.split(/(?<=[.!?])\s+/);
  return (parts[parts.length - 1] ?? line).trim();
}

function highlightPages(
  text: string,
  paragraph: string,
  cursor: { at: number },
  citations: Citation[],
  source: PaperSource,
  activePage: number | undefined,
  onOpenPage: OpenPage | undefined,
  onPreviewPage: OpenPage | undefined,
  onLocateClaim: LocateClaim | undefined,
): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PAGE_CITE)) {
    const index = match.index ?? 0;
    const label = match[0];
    if (index > last) nodes.push(text.slice(last, index));
    const pages = pagesInCite(label);
    const foundAt = paragraph.indexOf(label, cursor.at);
    const claim = claimBefore(paragraph, foundAt >= 0 ? foundAt : 0);
    if (foundAt >= 0) cursor.at = foundAt + label.length;
    const citedPage = pages.find((page) => quotesOnPage(citations, page).length > 0);
    const quotes = citedPage ? quotesOnPage(citations, citedPage) : [];
    const active = activePage !== undefined && pages.includes(activePage);
    if (source === "pdf" && pages.length > 0 && (citedPage ? onOpenPage && onPreviewPage : onLocateClaim)) {
      const open = () => {
        if (citedPage && onOpenPage) onOpenPage(citedPage, quotes);
        else onLocateClaim?.(pages, claim, false);
      };
      const preview = () => {
        if (citedPage && onPreviewPage) onPreviewPage(citedPage, quotes);
        else onLocateClaim?.(pages, claim, true);
      };
      nodes.push(
        <span
          key={`${index}-${label}`}
          role="button"
          tabIndex={0}
          className="page-cite"
          data-active={active ? "true" : "false"}
          onMouseEnter={preview}
          onClick={open}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            open();
          }}
        >
          {label}
        </span>,
      );
    } else {
      nodes.push(
        <span key={`${index}-${label}`} className="page-cite">
          {label}
        </span>,
      );
    }
    last = index + label.length;
  }
  if (nodes.length === 0) return text;
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderChildren(
  children: ReactNode,
  paragraph: string,
  cursor: { at: number },
  citations: Citation[],
  source: PaperSource,
  activePage: number | undefined,
  onOpenPage: OpenPage | undefined,
  onPreviewPage: OpenPage | undefined,
  onLocateClaim: LocateClaim | undefined,
): ReactNode {
  return Children.map(children, (child) =>
    typeof child === "string"
      ? highlightPages(
          child,
          paragraph,
          cursor,
          citations,
          source,
          activePage,
          onOpenPage,
          onPreviewPage,
          onLocateClaim,
        )
      : child,
  );
}

export function MarkdownView({
  text,
  citations = [],
  source = "text",
  activePage,
  onOpenPage,
  onPreviewPage,
  onLocateClaim,
}: {
  text: string;
  citations?: Citation[];
  source?: PaperSource;
  activePage?: number;
  onOpenPage?: OpenPage;
  onPreviewPage?: OpenPage;
  onLocateClaim?: LocateClaim;
}) {
  const paint = (children: ReactNode) =>
    renderChildren(
      children,
      textOf(children),
      { at: 0 },
      citations,
      source,
      activePage,
      onOpenPage,
      onPreviewPage,
      onLocateClaim,
    );

  return (
    <div className="markdown text-[15px] leading-7 font-medium text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{
          p: ({ children }) => <p>{paint(children)}</p>,
          li: ({ children }) => <li>{paint(children)}</li>,
          h2: ({ children }) => <h2>{paint(children)}</h2>,
          h3: ({ children }) => <h3>{paint(children)}</h3>,
          strong: ({ children }) => <strong>{paint(children)}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
