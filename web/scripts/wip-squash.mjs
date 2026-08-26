#!/usr/bin/env node
// wip-squash.mjs — Reconcile a vibe-coded feature branch.
//
// Auto-snapshots write `fixup! <subject>` commits when possible. This
// script runs `git rebase --autosquash` so they collapse into their
// parent real commit. Any remaining `wip:` commits (cases where no
// real commit existed yet) are listed for manual handling.
//
// Run from anywhere in the project. No args.
// Cross-platform (Node, no shell features).

import { execSync } from "node:child_process";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

function cap(args) {
  return execSync(`git ${args}`, {
    cwd: PROJECT_DIR,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function run(args, env = {}) {
  execSync(`git ${args}`, {
    cwd: PROJECT_DIR,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
}
function tryCap(args) { try { return cap(args); } catch { return ""; } }

const branch = tryCap("symbolic-ref --short HEAD");
if (!branch) { console.error("Detached HEAD — abort."); process.exit(1); }
if (branch === "main" || branch === "master") {
  console.error(`On ${branch}. Switch to a feature branch first.`);
  process.exit(1);
}

if (cap("status --porcelain")) {
  console.error("Working tree has uncommitted changes. Commit or stash first.");
  process.exit(1);
}

// Always use main as the rebase base — that's where wip-squash collapses the
// feature branch's history. @{upstream} on an already-pushed feature branch
// points to itself, leaving nothing in range.
const base = tryCap("rev-parse origin/main") || tryCap("rev-parse main");
if (!base) { console.error("No main branch found (origin/main or main)."); process.exit(1); }

const before = tryCap(`log --oneline ${base}..HEAD`);
const beforeCount = before ? before.split("\n").length : 0;
console.log(`Branch ${branch}: ${beforeCount} commits ahead of ${base.slice(0, 8)}.`);
if (beforeCount === 0) { console.log("Nothing to squash."); process.exit(0); }

console.log("Running autosquash...");
// Non-interactive autosquash: GIT_SEQUENCE_EDITOR=":" accepts the todo as-is.
const noopEditor = process.platform === "win32" ? "cmd /c exit" : ":";
try {
  run(`rebase ${base} --autosquash`, { GIT_SEQUENCE_EDITOR: noopEditor });
} catch {
  console.error("\nRebase failed (likely conflicts). Resolve, then run: git rebase --continue");
  process.exit(1);
}

const after = tryCap(`log --oneline ${base}..HEAD`).split("\n").filter(Boolean);
const wipRemaining = after.filter(l => / wip: /.test(l) || l.includes(" wip:"));

console.log(`\nDone. Commits now: ${after.length} (was ${beforeCount}).`);
if (wipRemaining.length) {
  console.log("\nRemaining wip: commits (no real commit preceded them — squash manually):");
  for (const l of wipRemaining) console.log("  " + l);
  console.log(`\nManual squash: git rebase -i ${base.slice(0, 8)}`);
}
console.log(`\nReview: git log --oneline ${base.slice(0, 8)}..HEAD`);
