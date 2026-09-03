import { getExaClient } from "../lib/exa-client";
import { NonRetryableError } from "../lib/errors";
import type { RawExaResult } from "../../lib/research/normalize-sources";

export interface ExaSearchInput {
  query: string;
  competitor?: string;
  researchId: string;
}

const RESULTS_PER_SEARCH = 5;
const SNIPPET_MAX_CHARACTERS = 500;

/** Runs one Exa search and returns normalized-enough raw results. Never called from Workflow code. */
export async function searchExa(input: ExaSearchInput): Promise<RawExaResult[]> {
  if (!input.query.trim()) {
    throw new NonRetryableError("searchExa received an empty query");
  }

  const exa = getExaClient();

  const response = await exa.search(input.query, {
    numResults: RESULTS_PER_SEARCH,
    type: "auto",
    contents: {
      text: { maxCharacters: SNIPPET_MAX_CHARACTERS },
    },
  });

  return response.results.map((result) => ({
    title: result.title,
    url: result.url,
    snippet: typeof result.text === "string" && result.text.length > 0 ? result.text : null,
    publishedDate: result.publishedDate ?? null,
    score: typeof result.score === "number" ? result.score : null,
  }));
}
