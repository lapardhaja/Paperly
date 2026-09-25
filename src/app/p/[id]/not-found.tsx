import Link from "next/link";

export default function PaperNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-start justify-center px-6">
      <p className="font-serif text-3xl text-ink">That paper is not on this computer.</p>
      <Link href="/" className="mt-6 text-sm text-accent">
        Upload another
      </Link>
    </main>
  );
}
