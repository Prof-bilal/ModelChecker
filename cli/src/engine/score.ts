/** Owns wiring scorers to settled cases (PHASES.md Phase 3): a scorer throw is
 * a `scoring_error`, never folded into `fail` (EVALUATIONS.md §6.1). */

import type { AdapterResponse } from "../adapters/types.js";
import { scoreJsonSchema, JSON_SCHEMA_RULE_VERSION } from "../scorers/json-schema.js";
import { scoreToolCallMatch, TOOL_CALL_MATCH_RULE_VERSION } from "../scorers/tool-call-match.js";
import type { ScorerResult } from "../scorers/types.js";
import type { CaseResult, SuiteCase } from "../types.js";

export function scoreCase(suiteCase: SuiteCase, response: AdapterResponse): { result: ScorerResult; rule: string } {
  switch (suiteCase.scoring) {
    case "json_schema@1": {
      const schema = (suiteCase.scoring_params as { schema?: Parameters<typeof scoreJsonSchema>[1]["schema"] }).schema;
      if (schema === undefined) {
        throw new Error(`Case "${suiteCase.case_id}" declares json_schema@1 but has no scoring_params.schema.`);
      }
      return { result: scoreJsonSchema(response, { schema }), rule: JSON_SCHEMA_RULE_VERSION };
    }
    case "tool_call_match@1": {
      const expectedTool = (suiteCase.scoring_params as { expected_tool?: string }).expected_tool;
      if (typeof expectedTool !== "string" || !Array.isArray(suiteCase.tools)) {
        throw new Error(`Case "${suiteCase.case_id}" declares tool_call_match@1 but is missing expected_tool or tools.`);
      }
      return {
        result: scoreToolCallMatch(response, { expected_tool: expectedTool, tools: suiteCase.tools }),
        rule: TOOL_CALL_MATCH_RULE_VERSION,
      };
    }
  }
}

export function applyScoring(caseResult: CaseResult, suiteCase: SuiteCase): CaseResult {
  // Only cases that produced a response get scored; request errors and
  // timeouts are settled outcomes and are not scored (EVALUATIONS.md §6).
  if (caseResult.outcome !== "pass" || caseResult.raw_response === null) {
    return caseResult;
  }
  try {
    const response = caseResult.raw_response as unknown as AdapterResponse & { __normalised?: boolean };
    const adapterResponse: AdapterResponse =
      response.__normalised === true
        ? response
        : normaliseRawForScoring(caseResult.raw_response);
    const { result, rule } = scoreCase(suiteCase, adapterResponse);
    return {
      ...caseResult,
      outcome: result.outcome,
      score: result.score,
      scoring_rule: rule as CaseResult["scoring_rule"],
      reason: result.reason ?? caseResult.reason,
    };
  } catch (error) {
    return {
      ...caseResult,
      outcome: "scoring_error",
      score: null,
      reason: `Scorer threw: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Raw responses are persisted verbatim; scoring needs the normalised view.
 * The raw payload is always an OpenAI-shaped chat completion (or mock fixture). */
function normaliseRawForScoring(raw: unknown): AdapterResponse {
  const p = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
  const choices = Array.isArray(p.choices) ? p.choices : [];
  const message = (
    typeof choices[0] === "object" && choices[0] !== null
      ? (choices[0] as Record<string, unknown>).message
      : undefined
  ) as Record<string, unknown> | undefined;

  let content: string | null = null;
  let toolCalls: Array<{ name: string; arguments: string }> | null = null;
  if (typeof message === "object" && message !== null) {
    content = typeof message.content === "string" ? message.content : null;
    if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
      toolCalls = message.tool_calls.map((tc) => {
        const call = tc as Record<string, unknown>;
        const fn = call.function as Record<string, unknown> | undefined;
        return {
          name: String(fn?.name ?? ""),
          arguments: typeof fn?.arguments === "string" ? fn.arguments : JSON.stringify(call.arguments ?? {}),
        };
      });
    }
  }
  return { content, tool_calls: toolCalls, model: String(p.model ?? "unknown"), latency_ms: 0, raw: p };
}
