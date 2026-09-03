import { describe, expect, it } from "vitest";

import { classifySourceType, normalizeSources, normalizeUrl } from "./normalize-sources";
import type { RawExaResult, SourceToNormalize } from "./normalize-sources";

function result(overrides: Partial<RawExaResult> = {}): RawExaResult {
  return {
    title: "Stripe Pricing",
    url: "https://stripe.com/pricing",
    snippet: "Stripe pricing details",
    publishedDate: "2024-01-01",
    score: 0.9,
    ...overrides,
  };
}

describe("normalizeUrl", () => {
  it("strips www, trailing slash, hash, and tracking params", () => {
    expect(normalizeUrl("https://www.Stripe.com/Pricing/?utm_source=x&ref=y#section")).toBe(
      "https://stripe.com/Pricing"
    );
  });

  it("treats trailing-slash and non-trailing-slash variants as identical", () => {
    expect(normalizeUrl("https://stripe.com/pricing/")).toBe(normalizeUrl("https://stripe.com/pricing"));
  });

  it("drops default ports", () => {
    expect(normalizeUrl("https://stripe.com:443/pricing")).toBe("https://stripe.com/pricing");
  });
});

describe("classifySourceType", () => {
  it("classifies the competitor's own domain as primary", () => {
    expect(classifySourceType("stripe.com", "Stripe")).toBe("primary");
    expect(classifySourceType("docs.stripe.com", "Stripe")).toBe("primary");
  });

  it("classifies known publications as secondary", () => {
    expect(classifySourceType("techcrunch.com", "Stripe")).toBe("secondary");
  });

  it("classifies everything else as unknown", () => {
    expect(classifySourceType("some-random-blog.dev", "Stripe")).toBe("unknown");
  });
});

describe("normalizeSources", () => {
  it("maps raw Exa results into the internal source shape", () => {
    const batches: SourceToNormalize[] = [
      { competitor: "Stripe", category: "pricing", results: [result()] },
    ];

    const [source] = normalizeSources("research_1", batches);

    expect(source).toMatchObject({
      researchId: "research_1",
      competitor: "Stripe",
      title: "Stripe Pricing",
      domain: "stripe.com",
      snippet: "Stripe pricing details",
      publishedDate: "2024-01-01",
      relevanceScore: 0.9,
      sourceType: "primary",
      searchCategory: "pricing",
    });
  });

  it("removes duplicate URLs across batches, keeping the first occurrence", () => {
    const batches: SourceToNormalize[] = [
      { competitor: "Stripe", category: "pricing", results: [result({ url: "https://stripe.com/pricing" })] },
      {
        competitor: "Stripe",
        category: "features",
        results: [result({ url: "https://www.stripe.com/pricing/", title: "Duplicate" })],
      },
    ];

    const sources = normalizeSources("research_1", batches);
    expect(sources).toHaveLength(1);
    expect(sources[0].title).toBe("Stripe Pricing");
  });

  it("does not invent missing fields - they stay undefined", () => {
    const batches: SourceToNormalize[] = [
      {
        competitor: "Stripe",
        category: "pricing",
        results: [result({ title: null, snippet: null, publishedDate: null, score: null })],
      },
    ];

    const [source] = normalizeSources("research_1", batches);
    expect(source.snippet).toBeUndefined();
    expect(source.publishedDate).toBeUndefined();
    expect(source.relevanceScore).toBeUndefined();
    expect(source.title).toBe("stripe.com");
  });

  it("skips malformed URLs instead of throwing", () => {
    const batches: SourceToNormalize[] = [
      { competitor: "Stripe", category: "pricing", results: [result({ url: "not a url" })] },
    ];

    expect(normalizeSources("research_1", batches)).toEqual([]);
  });
});
