import { SpecSection } from "./SpecSection";

/**
 * "Where ModelCheck fits" (§05) — how it relates to platforms the user already knows.
 * Qualitative only: every cell is a definitional difference, not a measured one,
 * so no research row is required (no invented numbers, Hard Rule 1). Excerpt-style
 * sentences, per PRODUCT.md §5; leaderboards are named without scores.
 */
const ROWS = [
  {
    platform: "OpenRouter",
    role: "Model gateway + public benchmark rankings",
    difference: "Routes your requests and ranks models on its own suite. ModelCheck runs your provider directly and measures the two capabilities your feature needs — on your machine, with your key.",
    you: "Keep OpenRouter for routing; measure here before you commit.",
  },
  {
    platform: "Chatbot Arena",
    role: "Community preference votes",
    difference: "Ranks models by how humans vote on anonymous chats. Human preference on open prompts is not whether your JSON parsed with the right fields (EVALUATIONS.md §4 keeps the two apart).",
    you: "Use it for a shortlist; use ModelCheck for your feature's contract.",
  },
  {
    platform: "Leaderboards (LMSYS, Artificial Analysis)",
    role: "Curated index scores",
    difference: "One number per model, on someone else's mix of tasks, refreshed on their schedule. An index score cannot tell you what changed for your cases — and mixing task types is what it spends its credibility on (E1).",
    you: "A lead, never a decision. Re-run on the versioned suite instead.",
  },
  {
    platform: "promptfoo, lm-evaluation-harness",
    role: "Eval frameworks / SDKs",
    difference: "Build-anything toolkits: assemble your own cases, scorers and CI wiring. ModelCheck ships one versioned suite, one scoring contract, and a report where every number carries its denominator.",
    you: "Reach for them when you want to build your own harness; ModelCheck when you want the answer.",
  },
] as const;

export function PlatformCompare() {
  return (
    <SpecSection
      id="vs-platforms"
      no="05"
      eyebrow="Where ModelCheck fits"
      title="Not a leaderboard. Not a gateway. Not a framework."
      lede="You already use platforms like these. ModelCheck answers the question none of them answer for your feature: what does this model change do to the capability you ship — with the evidence attached."
      rail={
        <a
          href="/docs/compare-platforms"
          className="mt-4 inline-block border-b border-accent pb-px text-xs font-bold text-text hover:text-accent"
        >
          Comparing platforms →
        </a>
      }
    >
      <div className="overflow-x-auto border border-border bg-surface">
        <table className="w-full min-w-[44rem] border-collapse text-left text-sm">
          <caption className="sr-only">
            How ModelCheck differs from platforms you may already use
          </caption>
          <thead className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-medium">
                Platform
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                What it is
              </th>
              <th scope="col" className="px-4 py-3.5 font-medium">
                The difference
              </th>
              <th scope="col" className="px-5 py-3.5 text-right font-medium">
                How to use it together
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.platform} className="border-b border-border last:border-b-0 align-top">
                <th scope="row" className="px-5 py-4 font-medium">
                  {r.platform}
                </th>
                <td className="px-4 py-4 text-text-muted">{r.role}</td>
                <td className="px-4 py-4 text-text-muted">{r.difference}</td>
                <td className="px-5 py-4 text-right text-text-muted">{r.you}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-text-muted">
        Comparisons are qualitative and by design: ModelCheck publishes no ranking of
        other platforms, and the suite — not an index score — is the evidence. A
        detailed, source-linked description of each surface is in{" "}
        <a
          href="/docs/compare-platforms"
          className="underline decoration-border underline-offset-4 hover:decoration-text"
        >
          Comparing platforms
        </a>
        .
      </p>
    </SpecSection>
  );
}
