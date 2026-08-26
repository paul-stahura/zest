#!/usr/bin/env node
// Cross-platform env check for `npm run setup`. Verifies Node version
// and reports python3 + mpmath status (needed for benchmark scripts).

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(here, "..", "package.json"), "utf8"));

const required = pkg.engines?.node ?? ">=20";
const minMajor = parseInt(required.replace(/[^0-9]/g, ""), 10) || 20;

const have = process.versions.node;
const haveMajor = parseInt(have.split(".")[0], 10);

let failed = false;

if (haveMajor < minMajor) {
  console.error(`Node ${required} required (have v${have}).`);
  console.error("  macOS:   brew install node  (or: nvm install --lts && nvm use --lts)");
  console.error("  Windows: winget install OpenJS.NodeJS.LTS  (or: fnm install --lts)");
  console.error("  Linux:   use nvm/fnm or your distro package manager");
  failed = true;
} else {
  console.log(`Node OK: v${have}`);
}

const py = which("python3") ?? which("python");
if (!py) {
  console.warn("python3 not found — benchmark/accuracy scripts will not run.");
} else {
  const probe = spawnSync(py, ["-c", "import mpmath"], { stdio: "ignore" });
  if (probe.status === 0) {
    console.log(`Python OK: ${py} (mpmath installed)`);
  } else {
    console.warn(`Python found at ${py} but mpmath missing.`);
    console.warn("  Install: pip3 install --user mpmath");
  }
}

if (failed) process.exit(1);
console.log("Setup complete. Try: npm run dev");

function which(cmd) {
  const isWin = process.platform === "win32";
  const probe = spawnSync(isWin ? "where" : "command", isWin ? [cmd] : ["-v", cmd], {
    shell: !isWin,
    encoding: "utf8",
  });
  if (probe.status !== 0) return null;
  const out = probe.stdout.trim().split(/\r?\n/)[0];
  return out || null;
}
