/**
 * Dev-only beacon: tells the Vite dev-server middleware whether a scan is
 * in flight, which writes `.zest/scan-status.json` so an outside observer can
 * avoid editing code mid-scan.
 *
 * No-op in production builds. Failures are swallowed — the beacon must never
 * affect the scan itself.
 */
export function reportScanStatus(running: boolean): void {
  if (!import.meta.env.DEV) return;
  try {
    void fetch("/__scan-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ running }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
}
