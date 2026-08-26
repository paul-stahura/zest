#!/usr/bin/env node
// auto-rebase.mjs — Periodically rebase the current branch onto latest origin/main.
// Cross-platform. Runs from UserPromptSubmit hook. Best-effort, silent on failure.
//
// Rules:
//  - never on main/master
//  - per-branch interval gate via .git/auto-rebase/<branch> (default 2h)
//  - require clean working tree (auto-snapshot runs first and commits WIP)
//  - never run during an in-progress rebase/merge/cherry-pick
//  - on conflict: `git rebase --abort`, leave repo as it was

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const REBASE_INTERVAL_MS =
  (parseInt(process.env.REBASE_INTERVAL ?? "7200", 10) || 7200) * 1000;

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
  process.stderr.write(`auto-rebase: ${msg}\n`);
}

function main() {
  if (!gitOK("rev-parse --git-dir")) return;

  const branch = gitCap("symbolic-ref --short HEAD", { allowFail: true });
  if (!branch || branch === "main" || branch === "master") return;

  const gitDirRaw = gitCap("rev-parse --absolute-git-dir");
  const gitDir = isAbsolute(gitDirRaw) ? gitDirRaw : resolve(PROJECT_DIR, gitDirRaw);
  const markerDir = join(gitDir, "auto-rebase");
  if (!existsSync(markerDir)) mkdirSync(markerDir, { recursive: true });
  const markerPath = join(markerDir, branch.replace(/[\/\\]/g, "_"));

  const now = Date.now();
  if (!existsSync(markerPath)) {
    // First run on this branch: initialize marker, don't rebase yet.
    writeFileSync(markerPath, String(now));
    return;
  }
  const lastMs = parseInt(readFileSync(markerPath, "utf8").trim(), 10) || 0;
  if (now - lastMs < REBASE_INTERVAL_MS) return;

  // Don't run during an in-progress git operation.
  if (
    existsSync(join(gitDir, "rebase-merge")) ||
    existsSync(join(gitDir, "rebase-apply")) ||
    existsSync(join(gitDir, "MERGE_HEAD")) ||
    existsSync(join(gitDir, "CHERRY_PICK_HEAD"))
  ) {
    log("skipping — git operation in progress");
    return;
  }

  // Require clean working tree. auto-snapshot runs first; if anything's left
  // dirty (refused snapshot, etc.), skip silently and try again next interval.
  const dirty = gitCap("status --porcelain", { allowFail: true });
  if (dirty) {
    log("skipping — working tree dirty");
    return;
  }

  if (!gitOK("fetch origin main")) {
    log("fetch failed — skipping");
    return;
  }

  const baseRef = gitOK("show-ref --verify refs/remotes/origin/main")
    ? "origin/main"
    : gitOK("show-ref --verify refs/heads/main")
    ? "main"
    : "";
  if (!baseRef) {
    log("no main ref — skipping");
    writeFileSync(markerPath, String(now));
    return;
  }

  // Already up-to-date with main?
  const behind = gitCap(`rev-list --count HEAD..${baseRef}`, { allowFail: true });
  if (behind === "0") {
    writeFileSync(markerPath, String(now));
    return;
  }

  if (gitOK(`rebase ${baseRef}`)) {
    log(`rebased ${branch} onto ${baseRef}`);
    writeFileSync(markerPath, String(now));
  } else {
    gitOK("rebase --abort");
    log(`rebase onto ${baseRef} had conflicts — aborted, will retry next interval`);
    // Update marker so we back off rather than retrying every prompt.
    writeFileSync(markerPath, String(now));
  }
}

try {
  main();
} catch (e) {
  log(`error: ${e.message}`);
}
process.exit(0);
