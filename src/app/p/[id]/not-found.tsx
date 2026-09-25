import Link from "next/link";

export default function PaperNotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="tool-card max-w-lg rounded-[1.4rem] px-8 py-10">
        <p className="font-serif text-3xl tracking-tight text-ink">That document is not on this computer.</p>
        <Link href="/" className="btn-primary mt-6 h-11 px-5 text-sm">
          Summarize another PDF
        </Link>
      </div>
    </main>
  );
}
