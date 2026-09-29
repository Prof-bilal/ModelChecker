import { MODEL_RESULTS, formatLatency, formatNumber } from "@/lib/benchmark-data";

function capabilitySummary(result: { pass: number; partial: number; fail: number; scored: number }, planned: number) {
  if (result.scored === 0) {
    return { primary: "not scored", secondary: `${planned} request errors` };
  }
  const passRate = Math.round((result.pass / result.scored) * 100);
  return {
    primary: `${passRate}% pass · ${result.pass}/${result.scored}`,
    secondary: `${result.partial} partial · ${result.fail} fail`,
  };
}

export function BenchmarkResultsTable({ compact = false }: { compact?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border bg-surface">
      <table className="w-full min-w-190 border-collapse text-left">
        <caption className="sr-only">Measured ModelCheck core suite results by model</caption>
        <thead className="border-b border-border text-xs uppercase tracking-wider text-text-muted">
          <tr>
            <th className="px-5 py-4 font-medium">Model</th>
            <th className="px-4 py-4 font-medium">Structured output</th>
            <th className="px-4 py-4 font-medium">Tool calling</th>
            <th className="px-4 py-4 font-medium">Latency p50 / p95</th>
            {!compact ? <th className="px-4 py-4 font-medium">Tokens in / out</th> : null}
            <th className="px-5 py-4 text-right font-medium">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {MODEL_RESULTS.map((result) => (
            <tr key={result.runId} className="border-t border-border first:border-t-0">
              <td className="px-5 py-5">
                <p className="font-medium">{result.name}</p>
                <p className="mt-1 font-mono text-xs text-text-muted">{result.modelId}</p>
                <p className="mt-1 font-mono text-[11px] text-text-muted">{result.runId}</p>
                {result.status === "completed_with_gaps" ? (
                  <p className="mt-2 text-xs text-warning">completed with gaps</p>
                ) : null}
              </td>
              <td className="tnum px-4 py-5 font-mono text-sm">
                <span className="text-text">{capabilitySummary(result.structuredOutput, 15).primary}</span>
                <span className="mt-1 block text-xs text-text-muted">{capabilitySummary(result.structuredOutput, 15).secondary}</span>
              </td>
              <td className="tnum px-4 py-5 font-mono text-sm">
                <span className="text-text">{capabilitySummary(result.toolCalling, 15).primary}</span>
                <span className="mt-1 block text-xs text-text-muted">{capabilitySummary(result.toolCalling, 15).secondary}</span>
              </td>
              <td className="tnum px-4 py-5 font-mono text-sm text-text-muted">
                {formatLatency(result.p50Ms)} / {result.p95Ms > 0 ? formatLatency(result.p95Ms) : "not available"}
              </td>
              {!compact ? (
                <td className="tnum px-4 py-5 font-mono text-sm text-text-muted">
                  {formatNumber(result.inputTokens)} / {formatNumber(result.outputTokens)}
                </td>
              ) : null}
              <td className="px-5 py-5 text-right">
                <span className="inline-flex rounded-pill border border-border-strong px-2.5 py-1 font-mono text-xs text-success">
                  {result.settledCases} / {result.plannedCases}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
