import type { Metadata } from "next";
import { Libre_Baskerville, Public_Sans } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const publicSans = Public_Sans({
  variable: "--font-public-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const libre = Libre_Baskerville({
  variable: "--font-libre",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Paperly",
  description: "Summarize PDFs, scans, and handwritten notes with page citations.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} ${libre.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
