/** Owns the shared CLI argument schema, parsing, and usage text. */

import { parseArgs } from "node:util";

export const COMMANDS = ["run", "compare", "list"] as const;

export type Command = (typeof COMMANDS)[number];

const OPTIONS = {
  suite: { type: "string" },
  model: { type: "string" },
  label: { type: "string" },
  repeat: { type: "string" },
  concurrency: { type: "string" },
  timeout: { type: "string" },
  "max-retries": { type: "string" },
  "spend-limit": { type: "string" },
  "base-url": { type: "string" },
  "api-key-env": { type: "string" },
  adapter: { type: "string" },
  json: { type: "boolean" },
  help: { type: "boolean", short: "h" },
} as const;

export const USAGE = `Usage: modelcheck <command> [options]

Commands:
  run       Run a model evaluation
  compare   Compare two local runs
  list      List local runs

Options:
  --suite <id>           Suite to run
  --model <id>           Model to evaluate
  --label <label>        Run label
  --repeat <count>       Repetitions per case
  --concurrency <count>  Maximum concurrent requests
  --timeout <ms>         Per-request timeout
  --max-retries <count>  Maximum retry attempts
  --spend-limit <usd>    Estimated spend limit
  --base-url <url>       Provider API base URL (for OpenRouter-compatible endpoints)
  --api-key-env <name>   Name of the environment variable holding the API key
                         (never pass the key itself)
  --adapter <name>       Adapter to use: openai-compatible (default), anthropic,
                         or mock (fixture-backed, offline testing)
  --json                 Emit machine-readable output
  -h, --help             Show this help message`;

export class UsageError extends Error {}

export interface ParsedArguments {
  command?: Command;
  help: boolean;
  values: ReturnType<typeof parseArgs>["values"];
  positionals: string[];
}

export function parseCliArgs(args: string[]): ParsedArguments {
  let parsed: ReturnType<typeof parseArgs>;

  try {
    parsed = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: OPTIONS,
    });
  } catch (error) {
    throw new UsageError(error instanceof Error ? error.message : String(error));
  }

  const [commandValue, ...positionals] = parsed.positionals;

  if (commandValue === undefined) {
    return {
      help: parsed.values.help === true,
      values: parsed.values,
      positionals,
    };
  }

  if (!isCommand(commandValue)) {
    throw new UsageError(
      `Unknown command "${commandValue}". Run modelcheck --help for usage.`,
    );
  }

  if (positionals.length > 0 && commandValue !== "compare") {
    throw new UsageError(
      `Command "${commandValue}" does not accept positional arguments. Run modelcheck --help for usage.`,
    );
  }

  return {
    command: commandValue,
    help: parsed.values.help === true,
    values: parsed.values,
    positionals,
  };
}

function isCommand(value: string): value is Command {
  return COMMANDS.some((command) => command === value);
}
