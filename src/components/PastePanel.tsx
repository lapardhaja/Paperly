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
        className="cursor-pointer text-sm text-accent"
      >
        Paste text instead
      </button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        onPaste(text);
      }}
    >
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paste the paper text"
        rows={10}
        className="w-full resize-y rounded-2xl border border-line bg-surface px-4 py-3 text-sm leading-6 outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="cursor-pointer text-sm text-muted"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={disabled || text.trim().length < 80}
          className="h-10 cursor-pointer rounded-full bg-accent px-4 text-sm text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Use this text
        </button>
      </div>
    </form>
  );
}
