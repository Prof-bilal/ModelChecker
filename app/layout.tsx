import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* D33 typography: JetBrains Mono is the whole UI voice (docs/decisions.md D33,
   which supersedes ../design.md §13 for this surface — see U1). */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ModelCheck — Know what a new AI model is actually good at",
  description:
    "Evaluate a model with your provider API key. Inspect its answers, speed, cost, and failures—then compare the evidence.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${jetbrains.variable} h-full antialiased`}
    >
      <body className="theme-dark min-h-full flex flex-col">{children}</body>
    </html>
  );
}
