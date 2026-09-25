import Link from "next/link";

export default function PaperNotFound() {
  return (
    <main className="landing-mesh flex min-h-dvh items-center justify-center px-6">
      <div className="tool-card max-w-lg px-8 py-10">
        <p className="text-3xl font-bold tracking-tight text-ink">That document is not on this computer.</p>
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white">
          Summarize another PDF
        </Link>
      </div>
    </main>
  );
}
