/** Discover compiled tests explicitly; directory/glob semantics differ by Node release. */
import { readdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const tests = (await readdir(dist, { recursive: true })).filter((name) => name.endsWith(".test.js")).sort().map((name) => path.join(dist, name));
if (!tests.length) throw new Error("No compiled test files found. Run npm run build first.");
console.log(`Running ${tests.length} compiled test files on ${process.version}.`);
const child = spawn(process.execPath, ["--test", ...process.argv.slice(2), ...tests], { stdio: "inherit" });
child.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
