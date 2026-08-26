import { useEffect, useState } from "react";

import { deriveVersionDisplay } from "@/app/versionDisplay";

/** How often to re-evaluate the relative age / freshness (ms). */
const TICK_MS = 30_000;

/**
 * Header status pill: shows how long ago the running build started. The dot
 * glows green while that timestamp is under 10 minutes old.
 *
 * The timestamp is the Vite-injected `__BUILD_TIME__` — dev-server start in
 * development, bundle build time in a production build.
 */
export function VersionBadge() {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const d = deriveVersionDisplay(__BUILD_TIME__, now);
  const dotColor = d.fresh ? "#37d67a" : "var(--text-dim)";

  return (
    <span className="app-version" title={d.title}>
      <span
        className="app-version-dot"
        style={{ background: dotColor, boxShadow: d.fresh ? "0 0 6px #37d67a" : "none" }}
      />
      <span style={{ color: "var(--text)" }}>{d.label}</span>
      <span className="app-version-detail">{d.detail}</span>
    </span>
  );
}
