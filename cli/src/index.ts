#!/usr/bin/env node
/** Owns top-level argument parsing, command dispatch, and exit codes. */

import { compareCommand } from "./commands/compare.js";
import { listCommand } from "./commands/list.js";
import { runCommand } from "./commands/run.js";
import { parseCliArgs, USAGE, UsageError } from "./lib/args.js";

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help || args.command === undefined) {
    console.error(USAGE);
    return;
  }

  switch (args.command) {
    case "run":
      await runCommand(args.values);
      return;
    case "compare":
      await compareCommand();
      return;
    case "list":
      await listCommand();
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof UsageError) {
    console.error(error.message);
    process.exitCode = 1;
  } else {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 2;
  }
}
