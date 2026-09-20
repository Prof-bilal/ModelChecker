/** Owns rendering report.json to a single self-contained report.html
 * (PHASES.md Phase 5). The renderer reads only `report.json` — no suite
 * files, no raw responses, no network (ARCHITECTURE.md §4). All CSS and JS
 * is inlined; all model output is escaped as inert text: it is untrusted
 * input and is never parsed or rendered as HTML or JSONP (SECURITY.md §4).
 *
 * Deterministic: the same report.json produces byte-identical HTML — the
 * golden test depends on it. No timestamps, no randomness. */

import { readFile, writeFile } from "node:fs/promises";

import type { CaseResult, Report } from "../types.js";

/** Escapes untrusted text for HTML context: & < > " ' are all escaped so a
 * value can never break out of an attribute or element (SECURITY.md §4). */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Renders any JSON value as escaped, inert text inside a <pre> block.
 * Model output is never parsed as HTML — it is text, however it looks. */
function escapedJson(value: unknown): string {
  const text = value === undefined ? "undefined" : JSON.stringify(value, null, 2);
  return `<pre class="raw">${escapeHtml(text)}</pre>`;
}

const OUTCOME_LABEL: Record<string, string> = {
  pass: "pass",
  fail: "fail",
  partial: "partial",
  request_error: "request error",
  scoring_error: "scoring error",
  skipped: "skipped",
  timeout: "timeout",
  not_run: "not run",
};

function outcomeBadge(outcome: CaseResult["outcome"]): string {
  const cls = ["pass", "fail", "partial", "request_error", "timeout", "scoring_error"].includes(outcome)
    ? `outcome-${outcome}`
    : "outcome-other";
  return `<span class="badge ${cls}">${escapeHtml(OUTCOME_LABEL[outcome] ?? outcome)}</span>`;
}

function fmtCost(value: number): string {
  if (value < 0.01) {
    return `$${value.toFixed(6)}`;
  }
  return `$${value.toFixed(4)}`;
}

const CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 0; background: #fafafa; color: #171717; line-height: 1.5; }
main { max-width: 60rem; margin: 0 auto; padding: 2rem 1.25rem 4rem; }
h1 { font-size: 1.4rem; margin: 0 0 0.25rem; }
h2 { font-size: 1.05rem; margin: 2rem 0 0.5rem; border-bottom: 1px solid #e5e5e5; padding-bottom: 0.3rem; }
.sub { color: #525252; font-size: 0.85rem; margin: 0 0 1.5rem; }
table { border-collapse: collapse; width: 100%; font-size: 0.85rem; background: #fff; }
th, td { text-align: left; padding: 0.4rem 0.6rem; border: 1px solid #e5e5e5; vertical-align: top; }
th { background: #f5f5f5; font-weight: 600; }
td.num, th.num { text-align: right; font-variant-numeric: tabular-nums; }
.status { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; background: #fef9c3; }
.status-completed { background: #dcfce7; }
.status-completed_with_gaps { background: #fef9c3; }
.status-failed, .status-aborted { background: #fee2e2; }
.badge { display: inline-block; padding: 0.05rem 0.45rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; }
.outcome-pass { background: #dcfce7; }
.outcome-fail { background: #fee2e2; }
.outcome-partial { background: #fef9c3; }
.outcome-request_error, .outcome-timeout, .outcome-scoring_error { background: #ffedd5; }
.outcome-other { background: #f5f5f5; }
.note { color: #525252; font-size: 0.8rem; margin: 0.4rem 0 0; }
details { background: #fff; border: 1px solid #e5e5e5; margin-bottom: 0.4rem; }
summary { cursor: pointer; padding: 0.45rem 0.6rem; font-size: 0.85rem; display: flex; gap: 0.6rem; align-items: baseline; flex-wrap: wrap; }
summary .case-id { font-weight: 600; font-family: ui-monospace, monospace; }
summary .score { color: #525252; font-size: 0.78rem; }
.raw { margin: 0; padding: 0.75rem; background: #fafafa; border-top: 1px solid #e5e5e5; font-size: 0.75rem; overflow-x: auto; white-space: pre-wrap; word-break: break-word; font-family: ui-monospace, "SF Mono", Menlo, monospace; }
.case-body { padding: 0.5rem 0.75rem 0.75rem; font-size: 0.8rem; }
.case-body .reason { color: #7c2d12; margin: 0.25rem 0 0.5rem; }
ul.limitations { font-size: 0.82rem; color: #404040; padding-left: 1.2rem; }
ul.limitations li { margin-bottom: 0.25rem; }
dl.params { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 1rem; font-size: 0.82rem; margin: 0; }
dl.params dt { color: #737373; }
dl.params dd { margin: 0; font-variant-numeric: tabular-nums; }
`;

const JS = `
// Only behaviour: expand/collapse all. No network, no storage.
function toggleAll(open) {
  document.querySelectorAll("details.case").forEach(function (d) { d.open = open; });
}
`;

function capabilityTable(report: Report): string {
  const rows = report.capabilities
    .map((cap) => {
      const interval =
        cap.interval === undefined || cap.interval === "not_available"
          ? "not_available"
          : `${cap.interval[0]}–${cap.interval[1]} ms`;
      return `      <tr>
        <td>${escapeHtml(cap.capability)}</td>
        <td class="num">${cap.scored}/${cap.planned}</td>
        <td class="num">${cap.pass}</td>
        <td class="num">${cap.fail}</td>
        <td class="num">${cap.partial}</td>
        <td class="num">${cap.request_errors}</td>
        <td class="num">${cap.scoring_errors}</td>
        <td class="num">${cap.timeouts}</td>
        <td class="num">${cap.settled === 0 ? "—" : `${Math.round(cap.coverage * 1000) / 10}%`}</td>
        <td class="num">${escapeHtml(interval)}</td>
      </tr>`;
    })
    .join("\n");
  return `<table>
    <thead>
      <tr>
        <th>Capability</th>
        <th class="num">Scored / planned</th>
        <th class="num">Pass</th>
        <th class="num">Fail</th>
        <th class="num">Partial</th>
        <th class="num">Req errors</th>
        <th class="num">Score errors</th>
        <th class="num">Timeouts</th>
        <th class="num">Coverage</th>
        <th class="num">p50–p95 latency</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
  </table>
  <p class="note">Capabilities not listed above were not tested. They are not zero.</p>`;
}

function caseSummary(c: CaseResult): string {
  const parts = [outcomeBadge(c.outcome)];
  if (c.error_class !== undefined) {
    parts.push(`<span class="score">error class: ${escapeHtml(c.error_class)}</span>`);
  }
  if (c.reason !== undefined && c.outcome !== "pass") {
    parts.push(`<span class="score">${escapeHtml(String(c.reason).slice(0, 160))}</span>`);
  }
  return parts.join(" ");
}

function caseDetails(report: Report): string {
  return report.cases
    .map((c) => {
      const score = c.score === null ? "not scored" : `score ${c.score}`;
      const cost =
        c.estimated_cost_usd === undefined
          ? ""
          : c.estimated_cost_usd === "unpriced"
            ? " · cost unpriced"
            : ` · est. ${fmtCost(c.estimated_cost_usd)}`;
      return `    <details class="case">
      <summary><span class="case-id">${escapeHtml(c.case_id)}</span> ${caseSummary(c)}<span class="score">${escapeHtml(score)} · ${c.latency_ms} ms · ${c.attempts} attempt(s)${escapeHtml(cost)}</span></summary>
      <div class="case-body">
${c.reason !== undefined ? `        <p class="reason">Reason: ${escapeHtml(String(c.reason))}</p>\n` : ""}        <p class="note">Scoring rule: ${escapeHtml(c.scoring_rule)} · raw provider response (inert text):</p>
${escapedJson(c.raw_response)}
      </div>
    </details>`;
    })
    .join("\n");
}

/** Renders the full HTML document for a report. Pure function of the report
 * object — use `readReportAndRenderHtml` for the file-to-file form. */
export function renderReportHtml(report: Report): string {
  const status = `<span class="status status-${escapeHtml(report.status)}">${escapeHtml(report.status)}</span>`;
  const p95 =
    report.latency.p95_ms === "not_available" ? "not_available" : `${report.latency.p95_ms} ms`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ModelCheck report — ${escapeHtml(report.requested_model)} — suite ${escapeHtml(report.suite_id)} ${escapeHtml(report.suite_version)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
  <h1>ModelCheck report</h1>
  <p class="sub">Model <strong>${escapeHtml(report.requested_model)}</strong> (resolved: ${escapeHtml(report.resolved_model)}) · suite <strong>${escapeHtml(report.suite_id)} ${escapeHtml(report.suite_version)}</strong> · ${escapeHtml(report.started_at_utc)} → ${escapeHtml(report.finished_at_utc)} UTC · status ${status} · run <code>${escapeHtml(report.run_id)}</code></p>

  <h2>Capabilities</h2>
${capabilityTable(report)}

  <h2>Cost</h2>
  <p class="note">Basis: <strong>${escapeHtml(report.cost.basis)}</strong>${
    report.cost.total_usd === "unpriced"
      ? " — the model has no price row in the dated table. A missing price is not zero."
      : ` — estimated from provider-returned token counts × the dated price table (not a bill).`
  } Price table: <code>${escapeHtml(report.cost.price_table_ref)}</code></p>
  <table>
    <tbody>
      <tr><th>Total (estimated)</th><td class="num">${report.cost.total_usd === "unpriced" ? "unpriced" : fmtCost(report.cost.total_usd)}</td></tr>
    </tbody>
  </table>

  <h2>Latency</h2>
  <table>
    <tbody>
      <tr><th>p50</th><td class="num">${report.latency.p50_ms} ms</td></tr>
      <tr><th>p95</th><td class="num">${escapeHtml(p95)}</td></tr>
      <tr><th>n</th><td class="num">${report.latency.n}</td></tr>
    </tbody>
  </table>
  <p class="note">p95 is only reported over ≥20 samples; below that it is not_available.</p>

  <h2>Parameters</h2>
  <dl class="params">
    <dt>temperature</dt><dd>${escapeHtml(String(report.parameters.temperature))}</dd>
    <dt>max_output_tokens</dt><dd>${escapeHtml(String(report.parameters.max_output_tokens))}</dd>
    <dt>seed</dt><dd>${escapeHtml(String(report.parameters.seed))}</dd>
    <dt>streaming</dt><dd>${report.parameters.streaming ? "true" : "false"}</dd>
    <dt>timeout_ms</dt><dd>${report.parameters.timeout_ms}</dd>
    <dt>max_retries</dt><dd>${report.parameters.max_retries}</dd>
    <dt>concurrency</dt><dd>${report.parameters.concurrency}</dd>
  </dl>

  <h2>Cases <span class="score">(${report.cases.length})</span> <button type="button" onclick="toggleAll(true)">expand all</button> <button type="button" onclick="toggleAll(false)">collapse all</button></h2>
${caseDetails(report)}

  <h2>Limitations</h2>
  <ul class="limitations">
${report.limitations.map((l) => `    <li>${escapeHtml(l)}</li>`).join("\n")}
  </ul>
</main>
<script>${JS}</script>
</body>
</html>
`;
}

/** Reads report.json from `reportPath` and writes `report.html` beside it.
 * The report is the renderer's only input (ARCHITECTURE.md §4). */
export async function renderReportHtmlFrom(reportPath: string): Promise<string> {
  const report = JSON.parse(await readFile(reportPath, "utf8")) as Report;
  const html = renderReportHtml(report);
  const htmlPath = reportPath.replace(/report\.json$/, "report.html");
  await writeFile(htmlPath, html, "utf8");
  return htmlPath;
}
