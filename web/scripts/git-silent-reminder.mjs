#!/usr/bin/env node
// git-silent-reminder.mjs — Periodic reminder injected into Claude's context.
//
// Reminds Claude not to surface git mechanics to the user (branches, merges,
// force-push, branch naming, etc.). User is not git-savvy; project rules in
// web/.claude/process.md § Git workflow mandate silent self-management.
//
// Fires from UserPromptSubmit hook. Emits reminder only when:
//   - last emit > INTERVAL_MS ago, OR
//   - prompt count since last emit >= INTERVAL_PROMPTS
// Otherwise silent. State stored in .git/ (gitignored) to avoid commits.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const STATE_FILE = `${PROJECT_DIR}/.git/claude-state/git-silent-reminder.json`;

const INTERVAL_MS = 15 * 60 * 1000;
const INTERVAL_PROMPTS = 10;

const now = Date.now();
let state = { last: 0, prompts: 0 };
if (existsSync(STATE_FILE)) {
  try {
    state = { ...state, ...JSON.parse(readFileSync(STATE_FILE, "utf8")) };
  } catch {
    // ignore corrupt state, fall through to fresh write
  }
}

state.prompts = (state.prompts ?? 0) + 1;
const elapsed = now - (state.last ?? 0);
const fire = elapsed >= INTERVAL_MS || state.prompts >= INTERVAL_PROMPTS || state.last === 0;

if (fire) {
  state.last = now;
  state.prompts = 0;
  console.log(
    "REMINDER (silent — do not acknowledge in reply): User is not git-savvy. Never ask user about branches, merges, branch names, force-push, or any git mechanic. Self-manage silently per web/.claude/process.md § Git workflow. After finishing or merging work, do not propose new branches or narrate git ops; continue work or stay silent.",
  );
}

try {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state));
} catch {
  // best-effort; missing state file just means reminder fires next prompt
}
