import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Paperly",
  description: "Summarize PDFs, scans, and handwritten notes with page citations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
