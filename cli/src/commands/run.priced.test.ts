/** End-to-end check for the priced path (PHASES.md Phase 4 verification): a
 * full mock run with a priced model must write a report whose per-case costs
 * come from the provider-returned token counts × the dated price row, and
 * whose run-level total is exactly their sum (EVALUATIONS.md §8.1, D18).
 * The expected per-case value is derived here from the same table the run
 * used — this test verifies the *wiring*, while estimate.test.ts pins the
 * arithmetic. No network: the mock adapter is selected explicitly. */

import assert from "node:assert/strict";
import { test } from "node:test";

import { runCommand } from "../commands/run.js";
import { caseCost, findPrice, loadPriceTable } from "../engine/estimate.js";

const PRICED_MODEL = "openai/gpt-4o"; // a sourced row exists in the table

test("priced model → per-case cost from provider token counts, total is the sum (end to end)", async () => {
  const { report } = await runCommand({
    suite: "core",
    model: PRICED_MODEL,
    adapter: "mock",
  });

  const table = loadPriceTable();
  const price = findPrice(table, PRICED_MODEL);
  assert.ok(price, "gpt-4o must have a priced row for this test to be meaningful");

  assert.equal(report.cost.basis, "estimated");

  // Every case that returned usage carries the cost computed from *its own*
  // token counts — not the pre-flight assumption, not a flat value.
  let sum = 0;
  for (const c of report.cases) {
    if (typeof c.input_tokens !== "number" || typeof c.output_tokens !== "number") {
      // No usage → outside the cost basis: absent, not zero, not "unpriced".
      assert.ok(
        c.estimated_cost_usd === undefined,
        `${c.case_id} has no usage and must not carry a cost value`,
      );
      continue;
    }
    const expected = caseCost(price, { input_tokens: c.input_tokens, output_tokens: c.output_tokens });
    assert.equal(
      c.estimated_cost_usd,
      expected,
      `${c.case_id}: cost must equal tokens × the dated price row`,
    );
    // And it must genuinely derive from the case's own tokens, not a constant
    // (compared at the same µ$ rounding caseCost applies).
    const raw: number = (c.input_tokens as number) / 1_000 * (price as { input_per_1k: number }).input_per_1k + (c.output_tokens as number) / 1_000 * (price as { output_per_1k: number }).output_per_1k;
    assert.equal(c.estimated_cost_usd, Math.round(raw * 1e6) / 1e6);
    sum += c.estimated_cost_usd as number;
  }

  // Run-level total is exactly the sum of the per-case values (rounded to µ$).
  assert.equal(report.cost.total_usd, Math.round(sum * 1e6) / 1e6);
  assert.ok((report.cost.total_usd as number) > 0);
  assert.equal(report.cost.price_table_ref.length > 0, true);
});
