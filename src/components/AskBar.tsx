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
      className={`fixed bottom-0 left-0 z-20 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur ${
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
          className="h-12 min-w-0 flex-1 rounded-full border border-line bg-surface px-5 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={disabled || value.trim().length === 0}
          className="h-12 cursor-pointer rounded-full bg-accent px-5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Ask
        </button>
      </div>
    </form>
  );
}
