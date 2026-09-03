/**
 * Thrown for permanent failures that retrying cannot fix (missing config, invalid
 * input). Activity options list this class name in `retry.nonRetryableErrorTypes`
 * so Temporal fails fast instead of burning through the retry policy.
 */
export class NonRetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NonRetryableError";
  }
}
