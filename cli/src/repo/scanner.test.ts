/** Tests deterministic, bounded repository profiling with no code execution. */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";

import { scanRepository } from "./scanner.js";
import { UsageError } from "../lib/args.js";

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "modelcheck-repo-"));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
  }
  return root;
}

test("detects languages, frameworks, database, tests, CI, and package manager", async (t) => {
  const root = await fixture({
    "package.json": JSON.stringify({ dependencies: { react: "1", next: "1", pg: "1" } }),
    "package-lock.json": "{}",
    "src/page.tsx": "export default function Page() { return <main />; }\n",
    "server/Program.cs": "class Program {}\n",
    "server/App.csproj": '<Project Sdk="Microsoft.NET.Sdk.Web"></Project>',
    "tests/page.test.ts": "export {};\n",
    ".github/workflows/test.yml": "name: test\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = await scanRepository(root);
  assert.deepEqual(profile.languages.map((item) => item.name), ["TypeScript", "C#"]);
  assert.deepEqual(profile.frameworks, ["ASP.NET Core", "Next.js", "React"]);
  assert.deepEqual(profile.databaseTechnologies, ["PostgreSQL"]);
  assert.equal(profile.hasTests, true);
  assert.equal(profile.hasCi, true);
  assert.deepEqual(profile.packageManagers, ["npm"]);
  assert.equal(profile.repoSize.sourceFiles, 3);
});

test("respects root gitignore and excludes common directories and secret files", async (t) => {
  const root = await fixture({
    ".gitignore": "ignored/\n*.generated.ts\n",
    "src/keep.ts": "export const keep = true;\n",
    "src/drop.generated.ts": "SECRET = 'not-read';\n",
    "ignored/private.ts": "export const ignored = true;\n",
    "node_modules/pkg/index.js": "module.exports = {};\n",
    ".codeatlas/tools/generated.py": "print('tool metadata')\n",
    ".env": "API_KEY=sentinel\n",
    "private.pem": "sentinel-private-key\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = await scanRepository(root);
  assert.deepEqual(profile.languages, [{ name: "TypeScript", files: 1 }]);
  assert.ok(profile.exclusions.ignored >= 4);
  assert.equal(profile.exclusions.sensitive, 2);
  assert.ok(!profile.relevantFiles.some((file) => file.includes(".env")));
});

test("empty repositories produce a stable empty profile", async (t) => {
  const root = await fixture({});
  t.after(() => rm(root, { recursive: true, force: true }));
  const first = await scanRepository(root);
  const second = await scanRepository(root);
  assert.deepEqual(first, second);
  assert.equal(first.repoSize.files, 0);
  assert.deepEqual(first.languages, []);
});

test("invalid paths and regular files are rejected", async (t) => {
  const root = await fixture({ "file.txt": "x" });
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(() => scanRepository(path.join(root, "missing")), UsageError);
  await assert.rejects(() => scanRepository(path.join(root, "file.txt")), /not a directory/);
});

test("large repositories stop at configured bounds without reading beyond them", async (t) => {
  const root = await fixture({
    "a.ts": "a\n",
    "b.ts": "b\n",
    "c.ts": "c\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = await scanRepository(root, { maxFiles: 2, maxFileBytes: 100, maxTotalBytes: 1_000 });
  assert.equal(profile.repoSize.files, 2);
  assert.equal(profile.repoSize.truncated, true);
});

test("mixed-language profile ordering is deterministic", async (t) => {
  const root = await fixture({
    "z.py": "print('z')\n",
    "a.go": "package main\n",
    "b.ts": "export {};\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const profile = await scanRepository(root);
  assert.deepEqual(profile.languages.map((item) => item.name), ["Go", "Python", "TypeScript"]);
  assert.ok(profile.architectureSignals.includes("mixed-language repository"));
});
