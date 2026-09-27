import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Crimson_Pro } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const sans = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-atkinson",
});

const serif = Crimson_Pro({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  variable: "--font-crimson",
});

export const metadata: Metadata = {
  title: "Paperly",
  description: "READ LESS. THINK MORE. Summarize PDFs, scans, and handwritten notes with page citations.",
  icons: {
    icon: [
      { url: "/brand/paperly-app-icon-light.svg", media: "(prefers-color-scheme: light)" },
      { url: "/brand/paperly-app-icon-dark.svg", media: "(prefers-color-scheme: dark)" },
    ],
    apple: "/brand/paperly-app-icon-light.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
