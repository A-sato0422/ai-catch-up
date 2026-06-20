#!/usr/bin/env node
/**
 * PostToolUse hook: runs tsc --noEmit on edited .ts/.tsx files.
 * Picks tsconfig based on path — batch/ uses batch/tsconfig.json,
 * everything else uses tsconfig.app.json (frontend src/).
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

// Read hook payload from stdin (JSON)
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const raw = Buffer.concat(chunks).toString("utf8").trim();

if (!raw) process.exit(0);

let payload;
try {
  payload = JSON.parse(raw);
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path ?? "";

// Guard: only .ts/.tsx files, skip node_modules
const isTs = filePath.endsWith(".ts") || filePath.endsWith(".tsx");
if (!isTs || filePath.includes("node_modules")) {
  process.exit(0);
}

// Normalize to forward-slash relative path for reliable prefix check
const rel = path
  .relative(repoRoot, path.resolve(filePath))
  .replaceAll(path.sep, "/");
const isBatch = rel.startsWith("batch/");

const tscScript = isBatch
  ? path.join(repoRoot, "batch/node_modules/typescript/bin/tsc")
  : path.join(repoRoot, "node_modules/typescript/bin/tsc");

const tsconfig = isBatch
  ? path.join(repoRoot, "batch/tsconfig.json")
  : path.join(repoRoot, "tsconfig.app.json");

try {
  execSync(`node "${tscScript}" --noEmit -p "${tsconfig}"`, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
} catch (err) {
  // tsc writes errors to stdout; stderr may carry invocation errors
  const errors =
    ((err.stdout ?? "") + (err.stderr ?? "")).trim() ||
    `tsc exited with code ${err.status ?? "unknown"}`;
  process.stderr.write(`[typecheck] ${rel}\n${errors}\n`);
  process.exit(2);
}
