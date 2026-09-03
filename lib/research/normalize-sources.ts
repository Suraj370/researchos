import type { NormalizedSource, SearchCategory, SourceType } from "@/lib/temporal-types";

const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
];

/** Normalizes a URL so trivial differences (tracking params, trailing slash, www, hash) don't create duplicate sources. */
export function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);

  url.hostname = url.hostname.toLowerCase();
  if (url.hostname.startsWith("www.")) {
    url.hostname = url.hostname.slice(4);
  }

  url.hash = "";
  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param);
  }
  url.searchParams.sort();

  const trimmedPath = url.pathname.replace(/\/+$/, "");
  url.pathname = trimmedPath === "" ? "/" : trimmedPath;

  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }

  return url.toString();
}

export function extractDomain(normalizedUrl: string): string {
  return new URL(normalizedUrl).hostname;
}

const KNOWN_PUBLICATIONS = new Set([
  "techcrunch.com",
  "forbes.com",
  "gartner.com",
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "businessinsider.com",
  "theverge.com",
  "wired.com",
  "venturebeat.com",
  "g2.com",
  "capterra.com",
  "trustradius.com",
  "crunchbase.com",
  "a16z.com",
]);

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Conservative, domain-based source classification. Replaceable later with an LLM-based classifier. */
export function classifySourceType(domain: string, competitor: string): SourceType {
  const labels = domain.toLowerCase().split(".");
  const competitorSlug = slugify(competitor);

  if (competitorSlug && labels.includes(competitorSlug)) {
    return "primary";
  }

  if (KNOWN_PUBLICATIONS.has(domain.toLowerCase())) {
    return "secondary";
  }

  return "unknown";
}

export interface RawExaResult {
  title: string | null;
  url: string;
  snippet: string | null;
  publishedDate: string | null;
  score: number | null;
}

export interface SourceToNormalize {
  competitor: string;
  category: SearchCategory;
  results: RawExaResult[];
}

/** Converts raw Exa results into our internal source format, deduping by normalized URL. Never invents data - unavailable fields stay undefined. */
export function normalizeSources(researchId: string, batches: SourceToNormalize[]): NormalizedSource[] {
  const seenUrls = new Set<string>();
  const normalized: NormalizedSource[] = [];

  for (const batch of batches) {
    for (const result of batch.results) {
      if (!result.url) continue;

      let url: string;
      try {
        url = normalizeUrl(result.url);
      } catch {
        continue;
      }

      if (seenUrls.has(url)) continue;
      seenUrls.add(url);

      const domain = extractDomain(url);

      normalized.push({
        researchId,
        competitor: batch.competitor,
        title: result.title?.trim() || domain,
        url,
        domain,
        snippet: result.snippet?.trim() || undefined,
        publishedDate: result.publishedDate ?? undefined,
        relevanceScore: typeof result.score === "number" ? result.score : undefined,
        sourceType: classifySourceType(domain, batch.competitor),
        searchCategory: batch.category,
      });
    }
  }

  return normalized;
}
