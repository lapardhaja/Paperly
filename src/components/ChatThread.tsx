"use client";

import { useEffect, useRef } from "react";

import { AnswerBlock } from "@/components/AnswerBlock";
import type { ChatMessage, PaperSource } from "@/lib/types";

export function ChatThread({
  messages,
  source,
  pending,
  onOpenPage,
}: {
  messages: ChatMessage[];
  source: PaperSource;
  pending: boolean;
  onOpenPage: (page: number) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  if (messages.length === 0 && !pending) {
    return (
      <p className="text-sm leading-6 text-muted">
        Ask about the method, the results, a figure, or what the paper does not say.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {messages.map((message) =>
        message.role === "user" ? (
          <div key={message.id} className="ml-auto max-w-[85%] rounded-2xl bg-accent-soft px-4 py-3">
            <p className="text-[15px] leading-7 whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div key={message.id} className="rounded-2xl border border-line bg-surface px-4 py-4">
            {message.answer ? (
              <AnswerBlock answer={message.answer} source={source} onOpenPage={onOpenPage} />
            ) : (
              <p className="text-[15px] leading-7">{message.content}</p>
            )}
          </div>
        ),
      )}
      {pending ? <p className="text-sm text-muted">Looking through the paper…</p> : null}
      <div ref={endRef} />
    </div>
  );
}
