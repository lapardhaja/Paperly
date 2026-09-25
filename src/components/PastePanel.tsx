"use client";

import { useState } from "react";

export function PastePanel({
  disabled,
  onPaste,
}: {
  disabled: boolean;
  onPaste: (text: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="cursor-pointer text-sm font-semibold text-accent underline-offset-4 hover:underline"
      >
        Paste text instead
      </button>
    );
  }

  return (
    <form
      className="tool-card flex flex-col gap-3 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onPaste(text);
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste the document text"
        rows={8}
        className="w-full resize-y rounded-xl border-2 border-line bg-surface px-4 py-3 text-sm leading-6 text-ink outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setOpen(false)} className="cursor-pointer text-sm font-semibold text-ink">
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled || text.trim().length < 80}
          className="h-10 cursor-pointer rounded-full bg-accent px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(208,0,0,0.28)] transition hover:bg-[#b00000] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Use this text
        </button>
      </div>
    </form>
  );
}
