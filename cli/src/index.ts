#!/usr/bin/env node
/** Owns top-level argument parsing, command dispatch, and exit codes. */

import { compareCommand } from "./commands/compare.js";
import { listCommand } from "./commands/list.js";
import { runCommand } from "./commands/run.js";
import { parseCliArgs, USAGE, UsageError } from "./lib/args.js";
import { ConfigError, SpendLimitError } from "./lib/errors.js";
import { SuiteLoadError } from "./lib/errors.js";
import { redactSecrets } from "./lib/redact.js";

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
      await compareCommand(args.positionals);
      return;
    case "list":
      await listCommand();
  }
}

try {
  await main();
} catch (error) {
  if (error instanceof UsageError) {
    console.error(redactSecrets(error.message));
    process.exitCode = 1;
  } else if (
    error instanceof ConfigError ||
    error instanceof SpendLimitError ||
    error instanceof SuiteLoadError
  ) {
    // Expected configuration failures: message only, no stack (CODESTYLE §2.4).
    console.error(error.message);
    process.exitCode = 1;
  } else {
    console.error(redactSecrets(error instanceof Error ? error.stack ?? error.message : String(error)));
    process.exitCode = 2;
  }
}
