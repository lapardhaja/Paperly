"use client";

import { useEffect, useRef } from "react";

import { AnswerBlock } from "@/components/AnswerBlock";
import { Waiting } from "@/components/Waiting";
import type { ChatMessage, OpenPage, PaperSource } from "@/lib/types";

export function ChatThread({
  messages,
  source,
  pending,
  activeQuote,
  onOpenPage,
  onPreviewPage,
}: {
  messages: ChatMessage[];
  source: PaperSource;
  pending: boolean;
  activeQuote?: string;
  onOpenPage: OpenPage;
  onPreviewPage: OpenPage;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  if (messages.length === 0 && !pending) {
    return (
      <p className="text-sm leading-6 font-medium text-ink">
        Ask about a method, a result, a figure, or something the document does not say.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <div key={message.id} className="ml-auto max-w-[85%] rounded-2xl border border-[#f0b4a8] bg-accent-soft px-4 py-3 shadow-[0_8px_20px_rgba(208,0,0,0.06)]">
            <p className="text-[15px] leading-7 font-medium whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div key={message.id} className="rounded-2xl border border-line bg-surface px-4 py-4 shadow-[0_8px_24px_rgba(0,0,0,0.05)]">
            {message.model ? (
              <p className="mb-2 font-mono text-xs font-semibold text-ink">{message.model}</p>
            ) : null}
            {message.answer ? (
              <AnswerBlock
                answer={message.answer}
                source={source}
                activeQuote={activeQuote}
                onOpenPage={onOpenPage}
                onPreviewPage={onPreviewPage}
              />
            ) : (
              <p className="text-[15px] leading-7">{message.content}</p>
            )}
          </div>
        ),
      )}
      {pending ? (
        <Waiting
          compact
          title="Looking through the document"
          steps={["Searching the pages", "Checking the wording", "Writing a cited answer"]}
        />
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
