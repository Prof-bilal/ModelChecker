import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* §13 typography contract: Inter (UI) + JetBrains Mono (data/code) */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="theme-dark min-h-full flex flex-col">{children}</body>
    </html>
  );
}
