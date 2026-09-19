# ModelCheck — Code Style

**Version:** 0.2 · **Date:** 2026-09-18
**This file owns:** conventions for code in this repository.
**Method:** derived from the existing code in `web/` (Next.js 16.3.5, React 19.2.8, Tailwind v4, TypeScript strict). Nothing here is invented: every rule below is either already followed by the existing components or is marked **[new]** as a rule for the CLI, which does not exist yet.

> **Rule:** the existing code is the reference implementation. When in doubt, read
> `components/` before inventing a pattern.

---

## 1. Existing conventions (observed)

These are facts about the current codebase. Follow them.

| Area | Convention | Evidence |
|---|---|---|
| Language | TypeScript, `strict: true` | `tsconfig.json` |
| Module system | ESM, `moduleResolution: "bundler"`, `isolatedModules: true` | `tsconfig.json` |
| Path alias | `@/*` → repository root | `tsconfig.json` `paths`; used as `@/components/Navbar` |
| Target | `ES2017`; `lib: dom, dom.iterable, esnext` | `tsconfig.json` |
| Indentation | 2 spaces | all source files |
| Statements | Semicolons present, always | all source files |
| Quotes | Double quotes | all source files |
| Trailing commas | Present in multiline literals | `Reveal.tsx`, `Capabilities.tsx` |
| Components | **Named** `export function ComponentName()`, never default-exported — except Next.js route files, which Next requires to default-export | `export function Navbar()`; `export default function LandingPage()` |
| Component files | One component per file, `PascalCase.tsx`, colocated in `components/` | `components/Hero.tsx` |
| Page files | `app/**/page.tsx`, default export, `export const metadata` when a page is not the root layout | `app/run/page.tsx` |
| Module constants | `SCREAMING_SNAKE_CASE`, declared above the component, typed `as const` | `const CAPS = [...] as const` |
| Interfaces | Inline prop types on the component signature; a named `interface` only when shared | `Reveal({...}: {...})` |
| Literal unions | Preferred over enums | `as?: "div" \| "section" \| "li" \| "tr"` |
| Client components | `"use client"` as the first line, only when hooks or browser APIs are needed | `Reveal.tsx`, `LiveDemo.tsx` |
| Styling | Tailwind utility classes via `className`; contract tokens referenced through `style={{ ... }}` with `var(--token)` | pervasive |
| CSS | Global tokens and keyframes in `app/globals.css`; tokens mapped into the Tailwind theme with `@theme inline` | `globals.css` |
| Type suppression | `@ts-expect-error` with an adjacent explanatory comment, never bare `@ts-ignore` | `Reveal.tsx` line 49 |
| Comments | `/** ... */` for component contracts; `//` for a rule citation (e.g. `// §13 ...`) | `InstallBar.tsx`, `globals.css` |
| Accessibility | `aria-hidden` on decorative glyphs, `aria-label` on landmarks, `caption`/`scope` on tables, `sr-only` where required | `Navbar.tsx`, `ComparisonExcerpt.tsx` |
| Lint | `eslint` flat config from `eslint-config-next/core-web-vitals` + `/typescript` | `eslint.config.mjs` |
| Formatter | **None configured.** Match surrounding style; do not introduce Prettier without a decision | absence of config |

### 1.1 Tailwind v4 notes specific to this repo

- Arbitrary-value syntax uses the v4 parenthesis form: `max-w-(--content-max)`, not `max-w-[var(--content-max)]`.
- Design tokens are consumed as utilities (`bg-accent`, `text-text-muted`, `font-mono`) because `@theme inline` maps them.
- `tnum` (tabular numerals) is a project class, not a Tailwind utility. Use it on every numeric table cell (`globals.css`).
- Dark values live in the `.theme-dark` class, not only in `prefers-color-scheme`. New surfaces must work in both.

### 1.2 Known existing rough edges

Recorded honestly rather than imitated:

- `ExampleReport.tsx` carries a `@ts-expect-error style prop on dynamic tag` on a `Reveal` that has no `style` prop in its signature. New code should extend the `Reveal` signature rather than add another suppression.
- `Reveal`'s `ref` is typed `HTMLDivElement` regardless of the `as` tag. Acceptable for now; do not copy the pattern into new components.
- `Capabilities.tsx` and `ComparisonExcerpt.tsx` show figures that are illustrative. Any new illustrative figure must carry a visible "Illustrative" note ([D5](./docs/decisions.md)).

---

## 2. CLI conventions **[new]**

The CLI does not exist yet. These rules bind it when it is written.

### 2.1 Naming

| Kind | Convention | Example |
|---|---|---|
| Files | `kebab-case.ts` for multi-word modules | `tool-call-match.ts`, `write-json.ts` |
| Functions | `camelCase`, verb-first for actions | `runSuite`, `aggregateCapabilities`, `classifyError` |
| Types / interfaces | `PascalCase`, no `I` prefix | `Report`, `CaseResult`, `ModelAdapter` |
| Domain literals | String unions, never enums | `type Outcome = "pass" \| "fail" \| ...` |
| Constants | `SCREAMING_SNAKE_CASE` | `DEFAULT_CONCURRENCY`, `RETRYABLE_STATUS` |
| Case ids | kebab-prefixed and numbered, per [benchmarks.md](./docs/benchmarks.md) | `so-007`, `tc-012` |
| Suite dirs | `<suite>/<semver>/` | `suites/core/1.0.0/` |

### 2.2 Module boundaries

- `adapters/` may import `types.ts`. It may **not** import from `scorers/` or `report/`.
- `scorers/` may import nothing but `types.ts`. **A scorer never performs I/O.**
- `report/` may import `types.ts` only. **The renderer never calls a provider and never reads a clock.**
- `engine/` may import `adapters/`, `scorers/` and `types.ts`.
- `commands/` compose everything and own the exit code.
- Core domain types live in exactly one file. Duplicating `Report` anywhere is a defect.

### 2.3 Async and concurrency

- `async`/`await` only. No raw `.then()` chains, except where a promise is
  deliberately not awaited yet.
- Concurrency is bounded by a helper that takes an explicit limit. Never
  `Promise.all` over an unbounded list of case executions.
- Every awaited network call has an explicit timeout. There is no such thing as a
  request without a deadline.
- No unhandled rejections. The top-level handler catches, classifies and exits.

### 2.4 Errors

- Distinguish **programmer error** from **expected provider failure**. Expected
  failures become `Outcome` values; unexpected throws crash loudly with a stack.
- Error classes are the closed set in
  [ARCHITECTURE.md](./ARCHITECTURE.md#52-concurrency-timeouts-retries):
  `auth`, `rate_limit`, `timeout`, `server`, `network`, `refusal`, `malformed`.
- User-facing messages follow the `../design.md` §15 shape: **object, reason, next
  step.** Example: `Provider rejected the API key (401). Check the key or use a different one.`
- Never `catch {}` and continue silently. A swallowed error is a wrong result.

### 2.5 Logging and output

- Progress and human-readable messages go to **stderr**.
- Machine-readable output (`--json`) goes to **stdout**, valid JSON, no ANSI escapes,
  no progress noise.
- Never print a request or response body in full to stdout.
- Never print a credential. Use the shared redaction helper for anything that could
  carry one.

### 2.6 Exit codes

| Code | Meaning |
|---|---|
| `0` | Execution completed (regardless of whether cases passed) |
| `1` | Configuration or usage error (bad flags, bad suite, missing key) |
| `2` | Execution error (provider unreachable; all cases failed to settle) |

A nonzero code means "ModelCheck could not do its job", **not** "the model scored
badly". Threshold-based failure is an explicit Stage 5 policy flag, never a default
(`../design.md` §12).

### 2.7 Dependency rules

1. **No new runtime dependency without a recorded decision** in
   [docs/decisions.md](./docs/decisions.md). This is a hard gate.
2. Prefer Node built-ins (`node:fs`, `fetch`, `node:test`, `node:assert`, `node:crypto`).
3. No provider SDK where a plain HTTP call suffices — SDKs are large, versioned
   separately from the model, and add a supply-chain surface. A raw request whose
   body we control is also more honest about what was sent.
4. No JSON-Schema library until hand-rolled validation proves insufficient, and then
   only with a recorded decision.
5. No test framework ([TESTING.md §2](./TESTING.md#2-framework-choice)).
6. No dependency may phone home, collect telemetry, or write outside the working directory.

### 2.8 Forbidden patterns

| Pattern | Why |
|---|---|
| Reading a credential from `process.argv` | Visible in `ps` and shell history ([SECURITY.md](./SECURITY.md)) |
| Writing a credential to any file or log | Same |
| `eval`, `new Function`, or `child_process` on model output | Model output is untrusted data |
| Executing generated code anywhere in v1 | Coding capability is excluded ([MVP §6](./MVP.md#6-explicitly-excluded-from-the-mvp)) |
| `dangerouslySetInnerHTML` for model output | XSS — the report renders inert text |
| An unbounded `Promise.all` | Provider rate limits and memory |
| Presenting "not tested" as `0` | [D4](./docs/decisions.md) |
| Presenting a model-judged number as a deterministic one | [EVALUATIONS §4](./EVALUATIONS.md#4-evaluator-types) |
| Inventing a cost when the price is unknown | `unpriced` is a valid answer |
| Omitting errors from a denominator | Denominators are the product |

## 3. Documentation in code

- Every module gets a one-line `/** ... */` header saying what it owns.
- A comment citing a rule uses the doc name and section: `// EVALUATIONS.md §7`,
  `// design.md §15`. Never cite a rule that does not exist.
- Do not restate the docs in comments. Link instead.
- If you change a rule a document owns, change the document in the same commit
  ([AGENTS.md §3](./AGENTS.md)).

## 4. Commit and review hygiene

Not a style rule, but the thing that keeps the others true:

- One concern per commit.
- A change to a scoring rule, a suite case, or the report schema is **never** mixed
  with unrelated work.
- If a change touches behaviour documented in `PRD.md`, `MVP.md`, `EVALUATIONS.md`,
  `SECURITY.md` or `TESTING.md`, the doc changes in the same commit.
- Run `npm run lint` and `npx tsc --noEmit` before declaring work done. Once the CLI
  exists, `npm test` as well.