import Exa from "exa-js";

import { NonRetryableError } from "./errors";

let client: Exa | null = null;

/** Lazily constructs the Exa client. Throws a non-retryable error if EXA_API_KEY is missing. */
export function getExaClient(): Exa {
  if (!client) {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      throw new NonRetryableError(
        "EXA_API_KEY environment variable is not set. Add it to .env.local before running research."
      );
    }
    client = new Exa(apiKey);
  }
  return client;
}
