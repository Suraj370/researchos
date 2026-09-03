const GENERIC_WRAPPER_MESSAGES = new Set(["Workflow execution failed", "Activity task failed"]);

/**
 * Temporal wraps activity/workflow failures in generic envelopes
 * (WorkflowFailedError -> ActivityFailure -> ApplicationFailure). This walks
 * the `.cause` chain to surface the original, specific error message instead
 * of a generic "Activity task failed". Pure - safe to call from Workflow code.
 */
export function extractFailureMessage(err: unknown): string | undefined {
  let current: unknown = err;
  let message: string | undefined;
  const seen = new Set<unknown>();

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    if (current.message && !GENERIC_WRAPPER_MESSAGES.has(current.message)) {
      message = current.message;
    }
    current = (current as { cause?: unknown }).cause;
  }

  return message;
}
