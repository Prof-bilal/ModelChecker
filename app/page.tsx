import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ExampleReport } from "@/components/ExampleReport";
import { Stepper } from "@/components/Stepper";
import { Capabilities } from "@/components/Capabilities";
import { ComparisonExcerpt } from "@/components/ComparisonExcerpt";
import { PlatformCompare } from "@/components/PlatformCompare";
import { Methodology } from "@/components/Methodology";
import { Faq } from "@/components/Faq";
import { CtaFooter } from "@/components/CtaFooter";

export default function LandingPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <ExampleReport />
        <Stepper />
        <Capabilities />
        <ComparisonExcerpt />
        <PlatformCompare />
        <Methodology />
        <Faq />
        <CtaFooter />
      </main>
    </>
  );
}
