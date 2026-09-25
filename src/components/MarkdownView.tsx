import { Children, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

const PAGE_CITE = /\[(?:Page|Pages)\s+\d+(?:\s*[–-]\s*\d+)?\]/g;

function highlightPages(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PAGE_CITE)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    nodes.push(
      <span key={`${index}-${match[0]}`} className="page-cite">
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (nodes.length === 0) return text;
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderChildren(children: ReactNode): ReactNode {
  return Children.map(children, (child) => (typeof child === "string" ? highlightPages(child) : child));
}

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="markdown text-[15px] leading-7 font-medium text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
        components={{
          p: ({ children }) => <p>{renderChildren(children)}</p>,
          li: ({ children }) => <li>{renderChildren(children)}</li>,
          h2: ({ children }) => <h2>{renderChildren(children)}</h2>,
          h3: ({ children }) => <h3>{renderChildren(children)}</h3>,
          strong: ({ children }) => <strong>{renderChildren(children)}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
