import ReactMarkdown from "react-markdown";

export function MarkdownView({ text }: { text: string }) {
  return (
    <div className="markdown text-[15px] leading-7 text-ink">
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}
