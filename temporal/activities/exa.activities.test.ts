import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiKey = process.env.EXA_API_KEY;

afterEach(() => {
  vi.resetModules();
  vi.unstubAllEnvs();
  if (originalApiKey === undefined) {
    delete process.env.EXA_API_KEY;
  } else {
    process.env.EXA_API_KEY = originalApiKey;
  }
});

describe("searchExa", () => {
  it("throws a NonRetryableError when EXA_API_KEY is missing", async () => {
    delete process.env.EXA_API_KEY;
    vi.resetModules();

    const { searchExa } = await import("./exa.activities");

    await expect(
      searchExa({ researchId: "r1", competitor: "Stripe", query: "Stripe pricing" })
    ).rejects.toMatchObject({ name: "NonRetryableError" });
  });

  it("throws a NonRetryableError for an empty query without calling Exa", async () => {
    process.env.EXA_API_KEY = "test-key";
    vi.resetModules();

    const { searchExa } = await import("./exa.activities");

    await expect(searchExa({ researchId: "r1", query: "   " })).rejects.toMatchObject({
      name: "NonRetryableError",
    });
  });

  it("maps Exa search results into RawExaResult shape", async () => {
    process.env.EXA_API_KEY = "test-key";
    vi.resetModules();

    vi.doMock("exa-js", () => ({
      default: class MockExa {
        search = vi.fn().mockResolvedValue({
          results: [
            {
              title: "Stripe Pricing",
              url: "https://stripe.com/pricing",
              text: "Transparent pricing for Stripe.",
              publishedDate: "2024-01-01",
              score: 0.95,
              id: "1",
            },
            {
              title: null,
              url: "https://example.com/stripe-review",
              publishedDate: undefined,
              score: undefined,
              id: "2",
            },
          ],
        });
      },
    }));

    const { searchExa } = await import("./exa.activities");
    const results = await searchExa({ researchId: "r1", competitor: "Stripe", query: "Stripe pricing" });

    expect(results).toEqual([
      {
        title: "Stripe Pricing",
        url: "https://stripe.com/pricing",
        snippet: "Transparent pricing for Stripe.",
        publishedDate: "2024-01-01",
        score: 0.95,
      },
      {
        title: null,
        url: "https://example.com/stripe-review",
        snippet: null,
        publishedDate: null,
        score: null,
      },
    ]);
  });
});
