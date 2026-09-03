import { getExaClient } from "../lib/exa-client";
import { extractExplicitCompetitors } from "../../lib/research/extract-competitors";
import { discoverCompetitorsFromResults } from "../../lib/research/discover-competitors";

export interface SearchCompetitorsInput {
  researchId: string;
  query: string;
}

export interface SearchCompetitorsResult {
  competitors: string[];
  source: "explicit" | "exa-discovery";
}

const DISCOVERY_RESULTS = 10;

/**
 * MVP competitor discovery: no LLM. Tries deterministic extraction from the
 * query text first; falls back to a general Exa search and derives candidate
 * companies from the result domains. Phase 3 will replace this with GPT-4.1 nano.
 */
export async function searchCompetitors(input: SearchCompetitorsInput): Promise<SearchCompetitorsResult> {
  const explicit = extractExplicitCompetitors(input.query);
  if (explicit.length > 0) {
    return { competitors: explicit, source: "explicit" };
  }

  const exa = getExaClient();
  const response = await exa.search(input.query, { numResults: DISCOVERY_RESULTS, type: "auto" });
  const discovered = discoverCompetitorsFromResults(response.results);

  return { competitors: discovered, source: "exa-discovery" };
}
