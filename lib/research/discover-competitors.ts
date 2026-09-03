/**
 * Fallback competitor discovery: given generic Exa search results for the
 * research query, derive candidate company names from result domains. Pure
 * function - the Exa call itself happens in the calling Activity.
 */

const IGNORED_DOMAIN_LABELS = new Set([
  "wikipedia",
  "reddit",
  "youtube",
  "twitter",
  "x",
  "linkedin",
  "facebook",
  "instagram",
  "medium",
  "quora",
  "google",
  "amazon",
  "wordpress",
  "blogspot",
  "github",
  "techcrunch",
  "forbes",
  "gartner",
  "bloomberg",
  "reuters",
  "wsj",
  "businessinsider",
  "theverge",
  "wired",
  "venturebeat",
  "g2",
  "capterra",
  "trustradius",
  "crunchbase",
]);

function titleCase(label: string): string {
  return label
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export interface DiscoverableResult {
  url: string;
}

export function discoverCompetitorsFromResults(
  results: DiscoverableResult[],
  maxCompetitors = 5
): string[] {
  const seen = new Set<string>();
  const competitors: string[] = [];

  for (const result of results) {
    if (competitors.length >= maxCompetitors) break;

    let hostname: string;
    try {
      hostname = new URL(result.url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }

    // Use the label right before the TLD (e.g. "wikipedia" in en.wikipedia.org,
    // "stripe" in stripe.com) rather than the leftmost label, which is often a subdomain.
    const labels = hostname.split(".");
    const label = labels.length >= 2 ? labels[labels.length - 2] : labels[0];
    if (!label || IGNORED_DOMAIN_LABELS.has(label)) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    competitors.push(titleCase(label));
  }

  return competitors;
}
