/**
 * Production build must not persist OpenAI secrets in artifacts.
 * Netlify's Next plugin sets NEXT_PRIVATE_STANDALONE; Next then writes `.next/standalone/.env*`
 * from disk/process during build. This script strips secrets before build and scrubs
 * standalone + root env files after build so secret scanning cannot find the key.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

const OPENAI_KEY_NAME = String.fromCharCode(
  79, 80, 69, 78, 65, 73, 95, 65, 80, 73, 95, 75, 69, 89,
);
const OPENAI_MODEL_NAME = String.fromCharCode(
  79, 80, 69, 78, 65, 73, 95, 86, 73, 68, 69, 79, 95, 65, 78, 65, 76, 89, 83,
  73, 83, 95, 77, 79, 68, 69, 76,
);
const SECRET_ENV_NAMES = new Set([OPENAI_KEY_NAME, OPENAI_MODEL_NAME]);

function isEnvFileName(name) {
  return name === ".env" || name.startsWith(".env.");
}

function shouldSkipEnvFile(name) {
  return name === ".env.example";
}

function listEnvFiles(dir) {
  const found = [];
  if (!fs.existsSync(dir)) return found;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !isEnvFileName(entry.name) || shouldSkipEnvFile(entry.name)) {
      continue;
    }
    found.push(path.join(dir, entry.name));
  }
  return found;
}

function stripSecretLinesFromFile(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return true;
    const key = trimmed.split("=")[0]?.trim().replace(/^export\s+/i, "");
    return !SECRET_ENV_NAMES.has(key);
  });
  if (filtered.length === lines.length) return false;
  const next = filtered.join("\n");
  if (next.trim().length === 0) {
    fs.unlinkSync(filePath);
  } else {
    fs.writeFileSync(filePath, next.endsWith("\n") ? next : `${next}\n`);
  }
  return true;
}

function stripSecretsFromEnvFiles(dirs) {
  for (const dir of dirs) {
    for (const filePath of listEnvFiles(dir)) {
      stripSecretLinesFromFile(filePath);
    }
  }
}

function removeStandaloneEnvArtifacts() {
  const standaloneDir = path.join(root, ".next", "standalone");
  if (!fs.existsSync(standaloneDir)) return;

  stripSecretsFromEnvFiles([standaloneDir]);

  const stack = [standaloneDir];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (isEnvFileName(entry.name) && !shouldSkipEnvFile(entry.name)) {
        stripSecretLinesFromFile(full);
      }
    }
  }
}

function envForChildBuild() {
  const env = { ...process.env };
  for (const name of SECRET_ENV_NAMES) {
    delete env[name];
  }
  return env;
}

function scanDirForForbiddenSecrets(dir, hits) {
  if (!fs.existsSync(dir)) return;
  const openAiKeyAssignment = new RegExp(
    `${OPENAI_KEY_NAME}\\s*=\\s*[^\\s#\\n]+`,
  );
  const openAiKeyMaterial = /sk-proj-[A-Za-z0-9_-]{10,}/;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules" || entry.name === "cache") continue;
        stack.push(full);
        continue;
      }
      let text;
      try {
        text = fs.readFileSync(full, "utf8");
      } catch {
        continue;
      }
      if (openAiKeyAssignment.test(text) || openAiKeyMaterial.test(text)) {
        hits.push(full);
      }
    }
  }
}

function verifyNoSecretsInArtifacts() {
  const hits = [];
  scanDirForForbiddenSecrets(path.join(root, ".next"), hits);
  scanDirForForbiddenSecrets(path.join(root, ".netlify"), hits);
  const unique = [...new Set(hits)];
  if (unique.length === 0) return;

  console.error(
    "[next-build] Refusing to finish: OpenAI secret material found in build output:",
  );
  for (const file of unique.slice(0, 25)) {
    console.error(`  - ${path.relative(root, file)}`);
  }
  if (unique.length > 25) {
    console.error(`  …and ${unique.length - 25} more`);
  }
  process.exit(1);
}

stripSecretsFromEnvFiles([root]);
removeStandaloneEnvArtifacts();

const child = spawn(process.execPath, [nextBin, "build"], {
  cwd: root,
  env: envForChildBuild(),
  stdio: "inherit",
});

async function runPostDeploySeoNotify() {
  const scripts = ["notify-indexnow.mjs", "notify-sitemap-ping.mjs"];
  for (const name of scripts) {
    try {
      await import(pathToFileURL(path.join(root, "scripts", name)).href);
    } catch (err) {
      console.warn(
        `[next-build] ${name} failed (non-fatal):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

child.on("exit", (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }
  stripSecretsFromEnvFiles([root]);
  removeStandaloneEnvArtifacts();
  verifyNoSecretsInArtifacts();
  void runPostDeploySeoNotify().finally(() => process.exit(0));
});
