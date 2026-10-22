/** Install the actual tarball and exercise its public binary without provider calls. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const source = fileURLToPath(new URL("../", import.meta.url));
const expectedVersion = JSON.parse(await readFile(path.join(source, "package.json"), "utf8")).version;
const temp = await mkdtemp(path.join(tmpdir(), "modelcheck-package-"));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function exec(command, args, cwd, expected = 0) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  if (result.error) throw result.error;
  assert.equal(result.status, expected, `${command} ${args.join(" ")}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
try {
  const [pack] = JSON.parse(exec(npm, ["pack", "--ignore-scripts", "--json", "--pack-destination", temp], source));
  const paths = pack.files.map((f) => f.path);
  for (const required of ["dist/index.js", "dist/project/commands.js", "dist/config/prices.json", "dist/docs/project-regression.md", "suites/core/1.0.0/suite.json", "examples/regression/pass.jsonl", "CHANGELOG.md"]) assert.ok(paths.includes(required), `Missing package file: ${required}`);
  assert.ok(paths.every((file) => !file.endsWith(".test.js") && !file.includes("node_modules/") && !file.startsWith(".env") && !file.endsWith(".lock")), "Package contains test code or local state");
  const install = path.join(temp, "install");
  exec(npm, ["install", "--omit=dev", "--no-audit", "--no-fund", "--prefix", install, path.join(temp, pack.filename)], temp);
  const pkg = path.join(install, "node_modules/modelcheck-cli");
  const bin = path.join(pkg, "dist/index.js");
  const project = path.join(temp, "project");
  await mkdir(project);
  const run = (args, status = 0) => exec(process.execPath, [bin, ...args], project, status);
  run(["--help"]);
  assert.equal(run(["--version"]).trim(), expectedVersion);
  run(["init", "--yes"]);
  run(["baseline", "--offline", "--responses", path.join(pkg, "examples/regression/pass.jsonl")]);
  const pass = JSON.parse(run(["verify", "--offline", "--responses", path.join(pkg, "examples/regression/pass.jsonl"), "--format", "json"]));
  assert.equal(pass.comparison.verdict, "PASS");
  assert.equal(pass.run.modelcheck_version, expectedVersion);
  const fail = JSON.parse(run(["verify", "--offline", "--responses", path.join(pkg, "examples/regression/fail.jsonl"), "--format", "json"], 1));
  assert.equal(fail.comparison.verdict, "FAIL");
  assert.equal(JSON.parse(await readFile(fail.verdict_artifact, "utf8")).comparison.verdict, "FAIL");
  assert.equal(JSON.parse(await readFile(path.join(pkg, "package.json"), "utf8")).version, expectedVersion);
  console.log(`Package ${pack.name}@${pack.version}: contents, production-only install, init, baseline, PASS and FAIL verified on ${process.version}.`);
} finally { await rm(temp, { recursive: true, force: true }); }
