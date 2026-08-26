#!/usr/bin/env node
// Auto-snapshot WIP commits. Cross-platform (macOS/Linux/Windows).
// Runs from Claude Code Stop + SessionEnd hooks.
//
// Behavior: see web/.claude/process.md § "WIP auto-snapshots".
// Key rules: never on main/master, gate by per-branch marker file,
// auto-extend .gitignore for junk, refuse on secret-shaped paths,
// refuse on files >10MB, scope all git ops to PROJECT_DIR pathspec
// (because web/ may be a subdirectory of a larger repo).

import { execSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const SNAPSHOT_INTERVAL_MS = (parseInt(process.env.SNAPSHOT_INTERVAL ?? "1800", 10) || 1800) * 1000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const PATHSPEC = ["--", "."];

function gitCap(args, { allowFail = false } = {}) {
  try {
    return execSync(`git ${args}`, {
      cwd: PROJECT_DIR,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    if (allowFail) return "";
    throw new Error(`git ${args} failed`);
  }
}

function gitOK(args) {
  try {
    execSync(`git ${args}`, { cwd: PROJECT_DIR, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function log(msg) {
  process.stderr.write(`auto-snapshot: ${msg}\n`);
}

function writeRefusedMarker(reason) {
  const claudeDir = join(PROJECT_DIR, ".claude");
  if (!existsSync(claudeDir)) return;
  const marker = join(claudeDir, "last-snapshot-refused");
  writeFileSync(marker, `${new Date().toISOString()}\n${reason}\n`);
}

function clearRefusedMarker() {
  const marker = join(PROJECT_DIR, ".claude", "last-snapshot-refused");
  if (existsSync(marker)) {
    try {
      execSync(process.platform === "win32" ? `del /f "${marker}"` : `rm -f "${marker}"`,
        { stdio: "ignore" });
    } catch { /* ignore */ }
  }
}

function main() {
  if (!gitOK("rev-parse --git-dir")) return;

  const branch = gitCap("symbolic-ref --short HEAD", { allowFail: true });
  if (!branch || branch === "main" || branch === "master") return;

  // Anything to do? (scoped to project subdir)
  const status = gitCap(`status --porcelain ${PATHSPEC.join(" ")}`, { allowFail: true });
  if (!status) return;

  // Per-branch marker file (in .git/) gates the interval check.
  // First run on a new branch initializes the marker but does not commit —
  // avoids the "fresh branch off old main commits immediately" footgun.
  // Use --absolute-git-dir to handle case where web/ is a subdir of the
  // larger repo (git rev-parse --git-dir may return absolute or relative
  // depending on git version + location).
  const gitDirRaw = gitCap("rev-parse --absolute-git-dir");
  const gitDir = isAbsolute(gitDirRaw) ? gitDirRaw : resolve(PROJECT_DIR, gitDirRaw);
  const markerDir = join(gitDir, "auto-snapshot");
  if (!existsSync(markerDir)) mkdirSync(markerDir, { recursive: true });
  const markerPath = join(markerDir, branch.replace(/[\/\\]/g, "_"));

  const now = Date.now();
  if (!existsSync(markerPath)) {
    writeFileSync(markerPath, String(now));
    return;
  }
  const lastMs = parseInt(readFileSync(markerPath, "utf8").trim(), 10) || 0;
  if (now - lastMs < SNAPSHOT_INTERVAL_MS) return;

  // Auto-extend .gitignore for junk patterns in untracked files.
  const IGNORE_RULES = [
    [/(^|\/)node_modules\//, "node_modules/"],
    [/(^|\/)dist\//, "dist/"],
    [/(^|\/)build\//, "build/"],
    [/(^|\/)\.next\//, ".next/"],
    [/(^|\/)\.nuxt\//, ".nuxt/"],
    [/(^|\/)coverage\//, "coverage/"],
    [/(^|\/)__pycache__\//, "__pycache__/"],
    [/\.pyc$/, "*.pyc"],
    [/(^|\/)\.DS_Store$/, ".DS_Store"],
    [/(^|\/)Thumbs\.db$/, "Thumbs.db"],
    [/(^|\/)\.vscode\//, ".vscode/"],
    [/(^|\/)\.idea\//, ".idea/"],
    [/\.log$/, "*.log"],
    [/(^|\/)\.cache\//, ".cache/"],
    [/(^|\/)tmp\//, "tmp/"],
    [/\.tmp$/, "*.tmp"],
    [/(^|\/)venv\//, "venv/"],
    [/(^|\/)\.venv\//, ".venv/"],
  ];

  // Filename-only secret patterns. Catches direnv (.envrc) and common secret extensions.
  const SECRET_RE =
    /(^|\/)(\.env(?:$|\..*|rc$)|.*\.(?:pem|key|p12|pfx|keystore|jks)$|id_rsa|id_ed25519|id_ecdsa|id_dsa|credentials(?:$|\..*)|secrets?(?:$|\/|\..*)|\.aws\/|\.ssh\/|.*\.gpg$|.*\.asc$)/;

  const untracked = gitCap(`ls-files --others --exclude-standard ${PATHSPEC.join(" ")}`, { allowFail: true })
    .split("\n").filter(Boolean);

  const gitignorePath = join(PROJECT_DIR, ".gitignore");
  const existingIgnore = existsSync(gitignorePath)
    ? readFileSync(gitignorePath, "utf8").split("\n").map(l => l.trim())
    : [];
  const ignoreSet = new Set(existingIgnore);
  const newIgnoreLines = [];
  const ignoredPaths = new Set();
  for (const path of untracked) {
    for (const [re, pattern] of IGNORE_RULES) {
      if (re.test(path)) {
        if (!ignoreSet.has(pattern)) {
          ignoreSet.add(pattern);
          newIgnoreLines.push(pattern);
          log(`adding '${pattern}' to .gitignore`);
        }
        ignoredPaths.add(path);
        break;
      }
    }
  }
  if (newIgnoreLines.length) {
    const sep = existsSync(gitignorePath) && readFileSync(gitignorePath, "utf8").endsWith("\n")
      ? "" : "\n";
    appendFileSync(gitignorePath, sep + newIgnoreLines.join("\n") + "\n");
  }

  // Collect changed paths (after .gitignore extension) for guards.
  const allChanged = gitCap(`status --porcelain ${PATHSPEC.join(" ")}`, { allowFail: true })
    .split("\n")
    .map(l => l.slice(3).trim())
    .filter(Boolean)
    .filter(p => !ignoredPaths.has(p));

  // Secret guard
  const secretHits = allChanged.filter(p => SECRET_RE.test(p));
  if (secretHits.length) {
    log("REFUSED — secret-shaped paths in changes:");
    for (const p of secretHits.slice(0, 5)) log(`  ${p}`);
    log("review manually, add to .gitignore or remove. Then re-run.");
    writeRefusedMarker(`secret-shaped paths: ${secretHits.join(", ")}`);
    return;
  }

  // Size guard (>10MB)
  const big = [];
  for (const p of allChanged) {
    const full = join(PROJECT_DIR, p);
    try {
      const sz = statSync(full).size;
      if (sz > MAX_FILE_SIZE) big.push({ path: p, mb: (sz / 1024 / 1024).toFixed(1) });
    } catch { /* file gone or special, skip */ }
  }
  if (big.length) {
    log("REFUSED — large files in changes (>10MB):");
    for (const { path, mb } of big) log(`  ${path} (${mb}MB)`);
    log("add to .gitignore or use Git LFS. Then re-run.");
    writeRefusedMarker(`large files: ${big.map(b => b.path).join(", ")}`);
    return;
  }

  // Commit .gitignore additions as a separate clean commit first.
  if (newIgnoreLines.length) {
    if (gitOK(`add -- .gitignore`) && !gitOK("diff --cached --quiet -- .gitignore")) {
      const ignMsg = `chore: ignore ${newIgnoreLines.join(", ")}`;
      const safeIgn = ignMsg.replace(/"/g, '\\"');
      gitOK(`commit --no-verify -m "${safeIgn}"`);
      log(`committed .gitignore additions`);
    }
  }

  // Stage everything else (scoped).
  gitOK(`add -A ${PATHSPEC.join(" ")}`);
  if (gitOK("diff --cached --quiet")) {
    writeFileSync(markerPath, String(Date.now()));
    return;
  }

  // Compose commit message: prefer fixup! into the most recent real commit on
  // this branch so wip-squash can autosquash without manual editing.
  // Use origin/main (or main) as the base — that's where wip-squash rebases to.
  let baseRef = gitOK("show-ref --verify refs/remotes/origin/main") ? "origin/main"
              : gitOK("show-ref --verify refs/heads/main") ? "main" : "";
  let msg = "";
  if (baseRef) {
    const subjects = gitCap(`log --format=%s ${baseRef}..HEAD`, { allowFail: true })
      .split("\n").filter(Boolean);
    const lastReal = subjects.find(s => !s.startsWith("fixup!") && !s.startsWith("squash!") && !s.startsWith("wip:"));
    if (lastReal) msg = `fixup! ${lastReal}`;
  }
  if (!msg) {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 16);
    msg = `wip: auto-snapshot ${ts}`;
  }

  const safeMsg = msg.replace(/"/g, '\\"');
  if (gitOK(`commit --no-verify -m "${safeMsg}"`)) {
    writeFileSync(markerPath, String(Date.now()));
    clearRefusedMarker();
    log(`committed on ${branch}: ${msg}`);
  }
}

try { main(); } catch (e) { log(`error: ${e.message}`); }
process.exit(0);
