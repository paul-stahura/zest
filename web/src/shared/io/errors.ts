/**
 * Structured I/O error carrying a correlation id for tracing import/export failures.
 */
export class IoError extends Error {
  public readonly correlationId: string;

  public constructor(message: string, correlationId: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "IoError";
    this.correlationId = correlationId;
  }
}
