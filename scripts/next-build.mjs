/**
 * Production build must not see OPENAI_API_KEY (Netlify scopes it to Builds).
 * Strip it from process.env and any .env files so Next cannot embed the value in output.
 * Runtime on Netlify Functions still receives the variable when handling requests.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const ENV_FILE_NAMES = [
  ".env",
  ".env.production",
  ".env.local",
  ".env.production.local",
];

const STRIP_LINE_PREFIXES = ["OPENAI_API_KEY=", "OPENAI_VIDEO_ANALYSIS_MODEL="];

function stripOpenAiLinesFromEnvFiles() {
  for (const name of ENV_FILE_NAMES) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    const lines = fs.readFileSync(filePath, "utf8").split("\n");
    const filtered = lines.filter(
      (line) => !STRIP_LINE_PREFIXES.some((pfx) => line.startsWith(pfx)),
    );
    if (filtered.length !== lines.length) {
      fs.writeFileSync(filePath, filtered.join("\n"));
    }
  }
}

function envWithoutOpenAi() {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.OPENAI_VIDEO_ANALYSIS_MODEL;
  return env;
}

stripOpenAiLinesFromEnvFiles();

const child = spawn("npx", ["next", "build"], {
  cwd: root,
  env: envWithoutOpenAi(),
  stdio: "inherit",
});

child.on("exit", (code) => {
  process.exit(code ?? 1);
});
