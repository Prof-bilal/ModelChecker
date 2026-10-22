#!/usr/bin/env node
/** Owns top-level argument parsing, command dispatch, and exit codes. */

import { compareCommand } from "./commands/compare.js";
import { listCommand } from "./commands/list.js";
import { repoCommand } from "./commands/repo.js";
import { runCommand, MODELCHECK_VERSION } from "./commands/run.js";
import { parseCliArgs, USAGE, UsageError } from "./lib/args.js";
import { ConfigError, SpendLimitError } from "./lib/errors.js";
import { SuiteLoadError } from "./lib/errors.js";
import { redactSecrets } from "./lib/redact.js";
import { projectCommand, projectError } from "./project/commands.js";

async function main(): Promise<void> {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.values.version === true) { console.log(MODELCHECK_VERSION); return; }

  if (args.help || args.command === undefined) {
    console.error(USAGE);
    return;
  }

  switch (args.command) {
    case "init":
    case "baseline":
    case "verify":
      try { process.exitCode = await projectCommand(args.command, args.values); }
      catch (error) { projectError(error, args.values.format === "json"); process.exitCode = 1; }
      return;
    case "run":
      await runCommand(args.values);
      return;
    case "compare":
      if (args.values.candidate !== undefined || args.values.current !== undefined || args.positionals.length === 1) {
        try { process.exitCode = await projectCommand("compare", args.values, args.positionals); }
        catch (error) { projectError(error, args.values.format === "json"); process.exitCode = 1; }
        return;
      }
      await compareCommand(args.positionals);
      return;
    case "list":
      await listCommand();
      return;
    case "repo":
      await repoCommand(args.positionals, args.values);
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
