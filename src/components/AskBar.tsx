"use client";

import { useState } from "react";

export function AskBar({
  disabled,
  drawerOpen,
  onAsk,
}: {
  disabled: boolean;
  drawerOpen: boolean;
  onAsk: (question: string) => void;
}) {
  const [value, setValue] = useState("");

  return (
    <form
      className={`fixed bottom-0 left-0 z-20 border-t border-line bg-surface/90 px-4 py-3 shadow-[0_-10px_30px_rgba(21,40,71,0.06)] backdrop-blur ${
        drawerOpen ? "right-0 hidden sm:block sm:right-[var(--drawer-w)]" : "right-0"
      }`}
      onSubmit={(event) => {
        event.preventDefault();
        const question = value.trim();
        if (!question || disabled) return;
        setValue("");
        onAsk(question);
      }}
    >
      <div className="mx-auto flex max-w-3xl gap-2">
        <label className="sr-only" htmlFor="ask-paper">
          Ask about this paper
        </label>
        <input
          id="ask-paper"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Ask about this paper"
          className="h-12 min-w-0 flex-1 rounded-full border-2 border-line bg-surface px-5 text-sm font-medium text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="btn-primary h-12 px-5 text-sm"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
