/** Owns bounded, deterministic, read-only repository metadata scanning. */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

import { UsageError } from "../lib/args.js";
import type { RepositoryProfile, RepositoryScanExclusions } from "../types.js";

export interface RepositoryScanLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
}

export const DEFAULT_REPOSITORY_SCAN_LIMITS: RepositoryScanLimits = {
  maxFiles: 10_000,
  maxFileBytes: 512 * 1024,
  maxTotalBytes: 32 * 1024 * 1024,
};

const IGNORED_DIRECTORIES = new Set([
  ".git", ".hg", ".svn", ".next", ".nuxt", ".cache", ".idea", ".vscode",
  ".agents", ".codeatlas", ".codex", ".commandcode", ".freebuff",
  "node_modules", "vendor", "bin", "obj", "dist", "build", "coverage",
  "target", ".venv", "venv", "__pycache__", ".pytest_cache", ".mypy_cache",
  ".terraform", "Pods", "DerivedData",
]);

const BINARY_EXTENSIONS = new Set([
  ".7z", ".avi", ".bin", ".bmp", ".class", ".dll", ".dylib", ".exe",
  ".gif", ".gz", ".ico", ".jar", ".jpeg", ".jpg", ".lockb", ".mov",
  ".mp3", ".mp4", ".o", ".obj", ".pdf", ".png", ".pyc", ".so",
  ".tar", ".ttf", ".webm", ".webp", ".woff", ".woff2", ".zip",
]);

const SENSITIVE_NAMES = new Set([
  "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519", ".npmrc", ".pypirc",
  "credentials", "credentials.json", "secrets.json", "secrets.yml", "secrets.yaml",
]);

const SOURCE_LANGUAGES: Record<string, string> = {
  ".c": "C", ".cc": "C++", ".cpp": "C++", ".cs": "C#", ".css": "CSS",
  ".dart": "Dart", ".ex": "Elixir", ".exs": "Elixir", ".go": "Go",
  ".h": "C/C++", ".hpp": "C++", ".html": "HTML", ".java": "Java",
  ".js": "JavaScript", ".jsx": "JavaScript", ".kt": "Kotlin", ".kts": "Kotlin",
  ".lua": "Lua", ".php": "PHP", ".py": "Python", ".rb": "Ruby",
  ".rs": "Rust", ".scala": "Scala", ".sh": "Shell", ".sql": "SQL",
  ".svelte": "Svelte", ".swift": "Swift", ".tsx": "TypeScript",
  ".ts": "TypeScript", ".vue": "Vue",
};

const PACKAGE_MANAGERS: Record<string, string> = {
  "package-lock.json": "npm", "npm-shrinkwrap.json": "npm", "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "Yarn", "bun.lock": "Bun", "bun.lockb": "Bun",
  "poetry.lock": "Poetry", "uv.lock": "uv", "Pipfile.lock": "Pipenv",
  "Cargo.lock": "Cargo", "go.sum": "Go modules", "Gemfile.lock": "Bundler",
  "composer.lock": "Composer", "packages.lock.json": "NuGet",
};

interface IgnoreRule { regex: RegExp; negated: boolean }

function globRegex(pattern: string): RegExp {
  let output = "";
  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index] ?? "";
    if (char === "*") {
      if (pattern[index + 1] === "*") {
        output += ".*";
        index += 1;
      } else {
        output += "[^/]*";
      }
    } else if (char === "?") {
      output += "[^/]";
    } else {
      output += char.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
    }
  }
  return new RegExp(`^${output}$`);
}

function parseGitignore(content: string): IgnoreRule[] {
  const rules: IgnoreRule[] = [];
  for (const sourceLine of content.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const negated = line.startsWith("!");
    let pattern = negated ? line.slice(1) : line;
    if (pattern === "") continue;
    pattern = pattern.replace(/^\//, "").replace(/\/$/, "/**");
    if (!pattern.includes("/")) pattern = `**/${pattern}`;
    rules.push({ regex: globRegex(pattern), negated });
  }
  return rules;
}

function ignoredByRules(relativePath: string, rules: IgnoreRule[]): boolean {
  let ignored = false;
  const candidates = [relativePath, `root/${relativePath}`];
  for (const rule of rules) {
    if (candidates.some((candidate) => rule.regex.test(candidate))) ignored = !rule.negated;
  }
  return ignored;
}

function isSensitive(relativePath: string): boolean {
  const name = path.basename(relativePath).toLowerCase();
  return name === ".env" || name.startsWith(".env.") || SENSITIVE_NAMES.has(name) ||
    /\.(pem|key|p12|pfx|crt|cer)$/i.test(name) ||
    /(^|[-_.])(secret|secrets|credential|credentials)([-_.]|$)/i.test(name);
}

function looksLikeTest(relativePath: string): boolean {
  const normalized = `/${relativePath.toLowerCase()}`;
  const base = path.basename(normalized);
  return normalized.includes("/test/") || normalized.includes("/tests/") ||
    normalized.includes("/__tests__/") || /\.(test|spec)\.[^.]+$/.test(base) ||
    /^test_.*\.py$/.test(base) || /tests?\.cs$/.test(base);
}

function addIf(set: Set<string>, condition: boolean, value: string): void {
  if (condition) set.add(value);
}

async function readSmallText(filePath: string, maxBytes: number): Promise<string | undefined> {
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size > maxBytes) return undefined;
    return await readFile(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function allDependencies(packageJson: Record<string, unknown>): Set<string> {
  const names = new Set<string>();
  for (const field of ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"]) {
    const value = packageJson[field];
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.keys(value).forEach((name) => names.add(name));
    }
  }
  return names;
}

export async function scanRepository(
  inputPath: string,
  limits: RepositoryScanLimits = DEFAULT_REPOSITORY_SCAN_LIMITS,
): Promise<RepositoryProfile> {
  const root = path.resolve(inputPath);
  let rootStat;
  try {
    rootStat = await stat(root);
  } catch {
    throw new UsageError(`Repository "${inputPath}" does not exist. Pass a local project directory.`);
  }
  if (!rootStat.isDirectory()) {
    throw new UsageError(`Repository "${inputPath}" is not a directory. Pass a local project directory.`);
  }

  const ignoreText = await readSmallText(path.join(root, ".gitignore"), limits.maxFileBytes);
  const ignoreRules = parseGitignore(ignoreText ?? "");
  const languageCounts = new Map<string, number>();
  const filePaths: string[] = [];
  const relevantFiles = new Set<string>();
  const packageManagers = new Set<string>();
  const frameworks = new Set<string>();
  const databases = new Set<string>();
  const projectTypes = new Set<string>();
  const exclusions: RepositoryScanExclusions = { ignored: 0, sensitive: 0, binary: 0, oversized: 0, unreadable: 0 };
  let sourceFiles = 0;
  let estimatedLines = 0;
  let bytesScanned = 0;
  let truncated = false;
  let hasTests = false;
  let hasCi = false;

  const directories = [""];
  while (directories.length > 0 && !truncated) {
    const relativeDirectory = directories.shift() ?? "";
    let entries;
    try {
      entries = await readdir(path.join(root, relativeDirectory), { withFileTypes: true });
    } catch {
      exclusions.unreadable += 1;
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const relativePath = path.posix.join(relativeDirectory.split(path.sep).join("/"), entry.name);
      if (entry.isSymbolicLink()) {
        exclusions.ignored += 1;
        continue;
      }
      if (entry.isDirectory()) {
        if (IGNORED_DIRECTORIES.has(entry.name) || ignoredByRules(`${relativePath}/`, ignoreRules) || ignoredByRules(relativePath, ignoreRules)) {
          exclusions.ignored += 1;
        } else {
          directories.push(relativePath);
        }
        continue;
      }
      if (!entry.isFile()) continue;
      if (filePaths.length >= limits.maxFiles || bytesScanned >= limits.maxTotalBytes) {
        truncated = true;
        break;
      }
      if (ignoredByRules(relativePath, ignoreRules)) {
        exclusions.ignored += 1;
        continue;
      }
      if (isSensitive(relativePath)) {
        exclusions.sensitive += 1;
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(extension)) {
        exclusions.binary += 1;
        continue;
      }
      let info;
      try {
        info = await stat(path.join(root, relativePath));
      } catch {
        exclusions.unreadable += 1;
        continue;
      }
      if (info.size > limits.maxFileBytes || bytesScanned + info.size > limits.maxTotalBytes) {
        exclusions.oversized += 1;
        if (bytesScanned + info.size > limits.maxTotalBytes) truncated = true;
        continue;
      }
      filePaths.push(relativePath);
      bytesScanned += info.size;
      const base = entry.name;
      if (PACKAGE_MANAGERS[base] !== undefined) packageManagers.add(PACKAGE_MANAGERS[base]);
      if (base === ".gitlab-ci.yml" || base === "azure-pipelines.yml" || relativePath.startsWith(".github/workflows/")) hasCi = true;
      if (looksLikeTest(relativePath)) hasTests = true;
      if (["package.json", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod", "Gemfile", "composer.json", "pom.xml", "build.gradle", "build.gradle.kts", "docker-compose.yml", "docker-compose.yaml"].includes(base) || /\.(csproj|sln)$/.test(base)) {
        relevantFiles.add(relativePath);
      }
      const language = SOURCE_LANGUAGES[extension];
      if (language !== undefined) {
        languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1);
        sourceFiles += 1;
        try {
          const text = await readFile(path.join(root, relativePath), "utf8");
          estimatedLines += text === "" ? 0 : text.split(/\r?\n/).length;
        } catch {
          exclusions.unreadable += 1;
        }
      }
    }
  }

  const packageText = await readSmallText(path.join(root, "package.json"), limits.maxFileBytes);
  if (packageText !== undefined) {
    try {
      const packageJson = JSON.parse(packageText) as Record<string, unknown>;
      const dependencies = allDependencies(packageJson);
      addIf(frameworks, dependencies.has("react"), "React");
      addIf(frameworks, dependencies.has("next"), "Next.js");
      addIf(frameworks, dependencies.has("vue"), "Vue");
      addIf(frameworks, dependencies.has("@angular/core"), "Angular");
      addIf(frameworks, dependencies.has("svelte") || dependencies.has("@sveltejs/kit"), "Svelte");
      addIf(frameworks, dependencies.has("express"), "Express");
      addIf(frameworks, dependencies.has("@nestjs/core"), "NestJS");
      addIf(frameworks, dependencies.has("fastify"), "Fastify");
      addIf(projectTypes, ["React", "Next.js", "Vue", "Angular", "Svelte"].some((item) => frameworks.has(item)), "frontend");
      addIf(projectTypes, ["Express", "NestJS", "Fastify", "Next.js"].some((item) => frameworks.has(item)), "backend");
      addIf(projectTypes, typeof packageJson.bin === "string" || (typeof packageJson.bin === "object" && packageJson.bin !== null), "CLI");
      addIf(projectTypes, "workspaces" in packageJson, "monorepo");
      addIf(databases, dependencies.has("pg") || dependencies.has("postgres"), "PostgreSQL");
      addIf(databases, dependencies.has("mysql") || dependencies.has("mysql2"), "MySQL");
      addIf(databases, dependencies.has("mssql"), "SQL Server");
      addIf(databases, dependencies.has("mongodb") || dependencies.has("mongoose"), "MongoDB");
      addIf(databases, dependencies.has("sqlite3") || dependencies.has("better-sqlite3"), "SQLite");
      addIf(databases, dependencies.has("@prisma/client") || dependencies.has("prisma"), "Prisma");
      addIf(databases, dependencies.has("sequelize"), "Sequelize");
      addIf(databases, dependencies.has("typeorm"), "TypeORM");
    } catch {
      exclusions.unreadable += 1;
    }
  }

  const allPaths = new Set(filePaths);
  const hasCsProject = filePaths.some((file) => file.endsWith(".csproj"));
  addIf(projectTypes, hasCsProject, ".NET");
  for (const csproj of filePaths.filter((file) => file.endsWith(".csproj")).slice(0, 20)) {
    const text = await readSmallText(path.join(root, csproj), limits.maxFileBytes);
    addIf(frameworks, text?.includes("Microsoft.NET.Sdk.Web") === true, "ASP.NET Core");
    addIf(projectTypes, text?.includes("Microsoft.NET.Sdk.Web") === true, "backend");
    addIf(databases, /EntityFrameworkCore|Microsoft\.Data\.SqlClient/i.test(text ?? ""), "SQL Server");
  }
  const pythonMetadata = ["requirements.txt", "pyproject.toml"].map((name) => allPaths.has(name) ? name : undefined).filter((name): name is string => name !== undefined);
  for (const name of pythonMetadata) {
    const text = (await readSmallText(path.join(root, name), limits.maxFileBytes))?.toLowerCase() ?? "";
    addIf(frameworks, /(^|\W)django(\W|$)/.test(text), "Django");
    addIf(frameworks, /(^|\W)flask(\W|$)/.test(text), "Flask");
    addIf(frameworks, /(^|\W)fastapi(\W|$)/.test(text), "FastAPI");
  }
  addIf(projectTypes, ["Django", "Flask", "FastAPI", "ASP.NET Core"].some((item) => frameworks.has(item)), "backend");
  addIf(frameworks, allPaths.has("Gemfile") && filePaths.some((file) => file.startsWith("app/controllers/")), "Ruby on Rails");
  addIf(frameworks, allPaths.has("pom.xml") || allPaths.has("build.gradle") || allPaths.has("build.gradle.kts"), "JVM project");
  addIf(projectTypes, allPaths.has("Cargo.toml") || allPaths.has("go.mod"), "systems/service");
  addIf(projectTypes, projectTypes.size === 0, "application/library");

  const languages = [...languageCounts.entries()]
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
  const architectureSignals = new Set<string>();
  addIf(architectureSignals, languages.length > 1, "mixed-language repository");
  addIf(architectureSignals, projectTypes.has("monorepo"), "workspace/monorepo layout");
  addIf(architectureSignals, hasTests, "automated tests detected");
  addIf(architectureSignals, hasCi, "CI configuration detected");
  addIf(architectureSignals, databases.size > 0, "persistent-data integration");
  addIf(architectureSignals, projectTypes.has("frontend") && projectTypes.has("backend"), "full-stack boundaries");
  addIf(architectureSignals, sourceFiles >= 50, "multi-file reasoning likely");
  addIf(architectureSignals, sourceFiles >= 500 || estimatedLines >= 50_000, "large repository context");
  addIf(architectureSignals, truncated, "profile limited by scan bounds");

  const detectedTechnologies = new Set<string>([
    ...languages.map((language) => language.name), ...frameworks, ...databases, ...packageManagers,
  ]);

  return {
    root,
    languages,
    frameworks: [...frameworks].sort(),
    projectTypes: [...projectTypes].sort(),
    packageManagers: [...packageManagers].sort(),
    databaseTechnologies: [...databases].sort(),
    repoSize: { files: filePaths.length, sourceFiles, estimatedLines, bytesScanned, truncated },
    hasTests,
    hasCi,
    architectureSignals: [...architectureSignals].sort(),
    detectedTechnologies: [...detectedTechnologies].sort(),
    relevantFiles: [...relevantFiles].sort().slice(0, 50),
    exclusions,
    limits: { ...limits },
  };
}
