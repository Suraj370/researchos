import OpenAI from "openai";

import { NonRetryableError } from "./errors";

export const ANALYSIS_MODEL = "gpt-4.1-nano";

let client: OpenAI | null = null;

/** Lazily constructs the OpenAI client. Throws a non-retryable error if OPENAI_API_KEY is missing. */
export function getOpenAIClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new NonRetryableError(
        "OPENAI_API_KEY environment variable is not set. Add it to .env.local before running analysis."
      );
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}
