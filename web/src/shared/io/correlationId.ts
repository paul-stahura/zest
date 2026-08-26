/**
 * Creates a correlation id suitable for browser-only tracing (import/export, parsing).
 */
export function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `corr-${String(Date.now())}-${String(Math.random()).slice(2)}`;
}
