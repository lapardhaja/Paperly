import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="markdown text-[15px] leading-7 text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
