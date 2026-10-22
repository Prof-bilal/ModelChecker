/** Bundle canonical documentation as build output; source remains in docs/. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const docs = new URL("../dist/docs/", import.meta.url);
await mkdir(docs, { recursive: true });
const source = await readFile(new URL("../../docs/regression-cli.md", import.meta.url), "utf8");
const portable = source.replace(/\]\((\.\.?\/[^)]+)\)/g, (_, relative) => `](${new URL(relative, "https://github.com/Prof-bilal/ModelChecker/blob/main/docs/regression-cli.md").href})`);
await writeFile(new URL("project-regression.md", docs), portable, "utf8");
console.log(`Bundled project guide in ${fileURLToPath(docs)}`);
