/** Golden test for report.json (TESTING.md §7): a fixed fixture input produces
 * byte-identical output against the approved golden file. Editing the golden
 * file to make a failing test pass is a review red flag — regenerate only with
 * UPDATE_GOLDEN=1 and justify the diff in review. The fixture input lives in
 * fixture-report.ts, shared with the HTML golden test so both artefacts are
 * always generated from the identical run. */

import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { buildFixtureReport } from "./fixture-report.js";
import { writeReportJson } from "./write-json.js";

const GOLDEN_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")),
  "..",
  "..",
  "tests",
  "fixtures",
  "reports",
  "golden",
  "report.json",
);

describe("write-json: golden test", () => {
  it("fixture input → byte-identical report.json", async () => {
    const report = buildFixtureReport();
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), "modelcheck-golden-"));
    try {
      const actualPath = await writeReportJson(report, tmpDir);
      const actual = await readFile(actualPath, "utf8");
      if (process.env.UPDATE_GOLDEN === "1") {
        // Opt-in regeneration (TESTING.md §7): justified in review, never used
        // to make a failing test pass silently.
        const { mkdir, writeFile } = await import("node:fs/promises");
        await mkdir(path.dirname(GOLDEN_PATH), { recursive: true });
        await writeFile(GOLDEN_PATH, actual, "utf8");
        return;
      }
      const expected = await readFile(GOLDEN_PATH, "utf8");
      assert.equal(actual, expected);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it("the built report passes the §5 validator", () => {
    // buildReport validates internally; a successful build is the assertion.
    const report = buildFixtureReport();
    assert.equal(report.schema_version, "1.0.0");
    assert.equal(report.limitations.length, 7);
  });
});
