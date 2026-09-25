"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

const PdfCanvas = dynamic(
  () => import("@/components/PdfCanvas").then((mod) => mod.PdfCanvas),
  { ssr: false },
);

export function PdfDrawer({
  paperId,
  pageCount,
  page,
  onPage,
  onClose,
}: {
  paperId: string;
  pageCount: number;
  page: number;
  onPage: (page: number) => void;
  onClose: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const fail = useCallback(() => setFailed(true), []);
  const safePage = Math.min(Math.max(page, 1), Math.max(pageCount, 1));
  const url = `/api/papers/${paperId}/pdf`;

  return (
    <aside className="fixed inset-0 z-30 flex flex-col bg-surface sm:inset-y-0 sm:left-auto sm:w-[440px] sm:border-l sm:border-line">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPage(safePage - 1)}
            disabled={safePage <= 1}
            className="h-8 cursor-pointer rounded-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Prev
          </button>
          <p className="text-sm text-muted">
            {safePage} / {pageCount}
          </p>
          <button
            type="button"
            onClick={() => onPage(safePage + 1)}
            disabled={safePage >= pageCount}
            className="h-8 cursor-pointer rounded-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
          </button>
        </div>
        <button type="button" onClick={onClose} className="cursor-pointer text-sm text-muted">
          Close
        </button>
      </div>
      {failed ? (
        <iframe title="Paper PDF" src={`${url}#page=${safePage}`} className="h-full w-full flex-1" />
      ) : (
        <PdfCanvas url={url} pageNumber={safePage} onError={fail} />
      )}
    </aside>
  );
}
