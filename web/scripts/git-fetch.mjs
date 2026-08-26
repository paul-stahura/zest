#!/usr/bin/env node
// Quiet `git fetch origin` for SessionStart hook. Cross-platform.
// Always exits 0 — fetch failure (offline, no remote) must not block session.
import { execSync } from "node:child_process";
const cwd = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
try { execSync("git fetch origin --quiet", { cwd, stdio: "ignore", timeout: 15000 }); }
catch { /* offline, no remote, etc. — silent */ }
