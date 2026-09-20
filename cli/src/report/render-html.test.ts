/** Golden test for report.html (TESTING.md §7, PHASES.md Phase 5): the same
 * fixture report that produces golden report.json produces byte-identical
 * report.html. Also pins the security contract: model output containing
 * <script> and <img onerror=…> renders as escaped, inert text — never as
 * markup (SECURITY.md §4). */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { buildFixtureReport, fixtureCases } from "./fixture-report.js";
import { renderReportHtml, renderReportHtmlFrom } from "./render-html.js";

const GOLDEN_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
  "..",
  "tests",
  "fixtures",
  "reports",
  "golden",
  "report.html",
);

describe("render-html: golden test", () => {
  it("fixture report → byte-identical report.html", async () => {
    const html = renderReportHtml(buildFixtureReport());
    if (process.env.UPDATE_GOLDEN === "1") {
      // Opt-in regeneration (TESTING.md §7): justified in review, never used
      // to make a failing test pass silently.
      await writeFile(GOLDEN_PATH, html, "utf8");
      return;
    }
    const expected = await readFile(GOLDEN_PATH, "utf8");
    assert.equal(html, expected);
  });

  it("renders the report structure: header, capability table, cost, latency, limitations", () => {
    const html = renderReportHtml(buildFixtureReport());
    // Header
    assert.match(html, /mock\/golden-model/);
    assert.match(html, /golden-model-2026-09-01/);
    assert.match(html, /suite <strong>core 1\.0\.0<\/strong>/);
    assert.match(html, /completed_with_gaps/);
    // Capability table with denominators
    assert.match(html, /<td>structured_output<\/td>/);
    assert.match(html, /<td class="num">3\/4<\/td>/);
    assert.match(html, /<td class="num">1\/3<\/td>/);
    // Coverage: 75% and 33.3% — and never a rounded 0 for a partial denominator
    assert.match(html, /75%/);
    assert.match(html, /33\.3%/);
    // Cost section: estimated basis + price table ref
    assert.match(html, /Basis: <strong>estimated<\/strong>/);
    assert.match(html, /price_table_ref|prices\.json/);
    // Latency: p50 present, p95 not_available (n=4 < 20)
    assert.match(html, /<td class="num">644 ms<\/td>/);
    assert.match(html, /not_available/);
    // All 7 limitations rendered
    const liCount = (html.match(/<li>/g) ?? []).length;
    assert.equal(liCount, 7);
    assert.match(html, /They are not zero\./);
    // Per-case sections with raw responses (inside <pre> the JSON quotes are
    // escaped too, so match the escaped form)
    assert.match(html, /so-004/);
    assert.match(html, /error class: rate_limit/);
    assert.match(html, /&quot;chatcmpl-fixture-1&quot;/);
  });
});

describe("render-html: escaping (SECURITY.md §4)", () => {
  it("model output containing <script> renders as inert text, not markup", () => {
    const cases = fixtureCases();
    cases[0] = {
      ...cases[0],
      raw_response: {
        choices: [{ message: { content: '<script>alert("pwned")</script>' } }],
      },
    };
    const report = { ...buildFixtureReport(), cases };
    const html = renderReportHtml(report);
    assert.ok(!html.includes("<script>alert"), "raw <script> from model output reached the HTML");
    // The content sits inside a JSON string inside <pre>, so the JSON-level
    // backslash-escaped quote becomes \\&quot; after HTML escaping.
    assert.match(html, /&lt;script&gt;alert\(\\&quot;pwned\\&quot;\)&lt;\/script&gt;/);
  });

  it("model output containing <img onerror=...> renders as escaped text in attribute and text context", () => {
    const cases = fixtureCases();
    cases[2] = {
      ...cases[2],
      reason: `Failed: <img src=x onerror="alert(1)"> & quotes ' "`,
      raw_response: { choices: [{ message: { content: "<img src=x onerror=alert(1)>" } }] },
    };
    const report = { ...buildFixtureReport(), cases };
    const html = renderReportHtml(report);
    assert.ok(!html.includes("<img "), "raw <img> from model output reached the HTML");
    assert.ok(!html.includes("onerror=\"alert(1)\""), "unescaped onerror attribute reached the HTML");
    assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
    assert.match(html, /Failed: &lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
  });

  it("a case_id, model name or reason carrying markup is escaped too", () => {
    const cases = fixtureCases();
    cases[0] = { ...cases[0], reason: `</details><script>x</script>` };
    const report = {
      ...buildFixtureReport(),
      cases,
      requested_model: '"><script>y</script>',
    };
    const html = renderReportHtml(report);
    assert.ok(!html.includes("</details><script>"));
    assert.ok(!html.includes('"><script>y</script>'), "unescaped model name reached the HTML");
    assert.match(html, /&lt;\/details&gt;&lt;script&gt;x&lt;\/script&gt;/);
  });
});

describe("render-html: file-to-file form", () => {
  it("renderReportHtmlFrom reads report.json and writes report.html beside it", async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "modelcheck-html-"));
    try {
      const reportPath = path.join(tmpDir, "report.json");
      await writeFile(reportPath, JSON.stringify(buildFixtureReport(), null, 2), "utf8");
      const htmlPath = await renderReportHtmlFrom(reportPath);
      assert.equal(path.basename(htmlPath), "report.html");
      const html = await readFile(htmlPath, "utf8");
      assert.equal(html, renderReportHtml(buildFixtureReport()));
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
