import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { buildRepositoryBenchmark } from "./benchmark.js";
import { scanRepository } from "./scanner.js";

test("builds a bounded repository-specific suite with deterministic facts and context", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-repo-benchmark-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "src"), { recursive: true });
  await writeFile(path.join(root, "package.json"), JSON.stringify({ dependencies: { react: "1" } }), "utf8");
  await writeFile(path.join(root, "package-lock.json"), "{}", "utf8");
  await writeFile(path.join(root, "src", "app.tsx"), "export const app = true;\n", "utf8");
  await writeFile(path.join(root, "src", ".env"), "SECRET=must-not-be-read\n", "utf8");

  const profile = await scanRepository(root);
  const benchmark = await buildRepositoryBenchmark(profile);

  assert.equal(benchmark.suite.meta.id, "repository");
  assert.equal(benchmark.suite.cases.length, 10);
  assert.ok(benchmark.contextPaths.includes("package.json"));
  assert.ok(!benchmark.contextPaths.some((item) => item.includes(".env")));
  assert.ok(benchmark.suite.cases.every((item) => item.scoring === "json_schema@1"));
  assert.ok(benchmark.suite.cases.every((item) => JSON.stringify(item.input).includes("Bounded repository context")));
});
