export interface CapabilityResult {
  pass: number;
  partial: number;
  fail: number;
  scored: number;
}

export interface BenchmarkModelResult {
  name: string;
  modelId: string;
  runId: string;
  status: "completed" | "completed_with_gaps";
  structuredOutput: CapabilityResult;
  toolCalling: CapabilityResult;
  p50Ms: number;
  p95Ms: number;
  inputTokens: number;
  outputTokens: number;
  settledCases: number;
  plannedCases: number;
}

export interface BenchmarkProject {
  slug: string;
  name: string;
  location: string;
  projectType: string;
  summary: string;
  languages: Array<{ name: string; files: number }>;
  frameworks: string[];
  technologies: string[];
  packageManagers: string[];
  database: string[];
  files: number;
  sourceFiles: number;
  estimatedLines: number;
  hasTests: boolean;
  hasCi: boolean;
  architectureSignals: string[];
  relevantFiles: string[];
  exclusions: number;
}

export const SUITE = {
  id: "core@1.0.0",
  hash: "183fe8c49bb98a49b1601707fe9c16bbc9f9bff0fa0d6b92b425980b7cf060f0",
  runDate: "29 Sep 2026",
  route: "Command Code provider API",
  repeats: 1,
  plannedCases: 30,
  capabilities: [
    { name: "Structured output", cases: 15, scorer: "json_schema@1" },
    { name: "Tool calling", cases: 15, scorer: "tool_call_match@1" },
  ],
} as const;

export const MODEL_RESULTS: BenchmarkModelResult[] = [
  {
    name: "DeepSeek V4 Flash",
    modelId: "deepseek/deepseek-v4-flash",
    runId: "run-20260929T082658-deepseek-v4-flash-fixed",
    status: "completed",
    structuredOutput: { pass: 15, partial: 0, fail: 0, scored: 15 },
    toolCalling: { pass: 12, partial: 2, fail: 1, scored: 15 },
    p50Ms: 3207,
    p95Ms: 5523,
    inputTokens: 9660,
    outputTokens: 5517,
    settledCases: 30,
    plannedCases: 30,
  },
  {
    name: "GLM-5.3 Flash",
    modelId: "z-ai/glm-5.3-flash",
    runId: "run-20260929T082659-glm-5.3-flash-fixed",
    status: "completed_with_gaps",
    structuredOutput: { pass: 0, partial: 0, fail: 0, scored: 0 },
    toolCalling: { pass: 13, partial: 1, fail: 1, scored: 15 },
    p50Ms: 9857,
    p95Ms: 0,
    inputTokens: 4813,
    outputTokens: 2425,
    settledCases: 15,
    plannedCases: 30,
  },
  {
    name: "Kimi K2.7 Code",
    modelId: "moonshotai/Kimi-K2.7-Code",
    runId: "run-20260929T082700-kimi-k2.7-code-fixed",
    status: "completed",
    structuredOutput: { pass: 14, partial: 0, fail: 1, scored: 15 },
    toolCalling: { pass: 13, partial: 1, fail: 1, scored: 15 },
    p50Ms: 4413,
    p95Ms: 15209,
    inputTokens: 4777,
    outputTokens: 5930,
    settledCases: 30,
    plannedCases: 30,
  },
  {
    name: "GPT-6 Luna",
    modelId: "gpt-6-luna",
    runId: "run-20260929T082700-gpt-6-luna-fixed",
    status: "completed",
    structuredOutput: { pass: 15, partial: 0, fail: 0, scored: 15 },
    toolCalling: { pass: 12, partial: 2, fail: 1, scored: 15 },
    p50Ms: 2928,
    p95Ms: 4411,
    inputTokens: 3392,
    outputTokens: 1993,
    settledCases: 30,
    plannedCases: 30,
  },
];

export const BENCHMARK_PROJECTS: BenchmarkProject[] = [
  {
    slug: "codeatlas",
    name: "CodeAtlas",
    location: "~/Projects/CodeAtlas",
    projectType: "Application / library monorepo",
    summary: "A large TypeScript code-intelligence repository with multiple packages, automated tests, and CI.",
    languages: [
      { name: "TypeScript", files: 559 },
      { name: "CSS", files: 2 },
      { name: "HTML", files: 2 },
      { name: "JavaScript", files: 2 },
      { name: "Shell", files: 1 },
    ],
    frameworks: [],
    technologies: ["TypeScript", "pnpm", "HTML", "CSS", "Shell"],
    packageManagers: ["pnpm"],
    database: [],
    files: 795,
    sourceFiles: 566,
    estimatedLines: 98052,
    hasTests: true,
    hasCi: true,
    architectureSignals: ["Large repository context", "Mixed-language repository", "Multi-file reasoning likely"],
    relevantFiles: ["apps/cli/package.json", "apps/desktop/package.json", "packages/core/package.json", "packages/mcp/package.json"],
    exclusions: 83,
  },
  {
    slug: "openmontage",
    name: "OpenMontage",
    location: "~/Documents/OpenMontage",
    projectType: "Backend application",
    summary: "A Python-first FastAPI backend with a TypeScript composition surface, tests, and CI.",
    languages: [
      { name: "Python", files: 419 },
      { name: "TypeScript", files: 39 },
      { name: "JavaScript", files: 10 },
      { name: "HTML", files: 5 },
      { name: "Shell", files: 3 },
      { name: "CSS", files: 2 },
    ],
    frameworks: ["FastAPI"],
    technologies: ["Python", "FastAPI", "TypeScript", "JavaScript", "npm"],
    packageManagers: ["npm"],
    database: [],
    files: 1097,
    sourceFiles: 478,
    estimatedLines: 128512,
    hasTests: true,
    hasCi: true,
    architectureSignals: ["Large repository context", "Mixed-language repository", "Multi-file reasoning likely"],
    relevantFiles: ["requirements.txt", "remotion-composer/package.json"],
    exclusions: 59,
  },
  {
    slug: "fanhub-plus",
    name: "FanHub+",
    location: "~/Videos/FanHub+",
    projectType: "Full-stack .NET application",
    summary: "An ASP.NET Core and React application with a SQL Server data layer, automated tests, and CI.",
    languages: [
      { name: "C#", files: 129 },
      { name: "TypeScript", files: 90 },
      { name: "CSS", files: 1 },
      { name: "HTML", files: 1 },
      { name: "SQL", files: 1 },
    ],
    frameworks: ["ASP.NET Core", "React"],
    technologies: ["C#", "ASP.NET Core", "React", "TypeScript", "SQL Server"],
    packageManagers: ["npm"],
    database: ["SQL Server"],
    files: 271,
    sourceFiles: 222,
    estimatedLines: 40665,
    hasTests: true,
    hasCi: true,
    architectureSignals: ["Full-stack boundaries", "Mixed-language repository", "Persistent-data integration"],
    relevantFiles: ["Fandom-Universe-BackEnd/FandomUniverse/FandomUniverse.csproj", "Fandom-Universe-BackEnd/docker-compose.yml", "package.json"],
    exclusions: 257,
  },
];

export function benchmarkProject(slug: string): BenchmarkProject | undefined {
  return BENCHMARK_PROJECTS.find((project) => project.slug === slug);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatLatency(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)} s` : `${value} ms`;
}
