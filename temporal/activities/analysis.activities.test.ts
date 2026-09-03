import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("openai");
  if (originalApiKey === undefined) {
    delete process.env.OPENAI_API_KEY;
  } else {
    process.env.OPENAI_API_KEY = originalApiKey;
  }
});

function mockOpenAI(parsed: unknown) {
  vi.doMock("openai", () => ({
    default: class MockOpenAI {
      chat = {
        completions: {
          parse: vi.fn().mockResolvedValue({ choices: [{ message: { parsed } }] }),
        },
      };
    },
  }));
}

describe("extractFacts", () => {
  it("throws a NonRetryableError when OPENAI_API_KEY is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();

    const { extractFacts } = await import("./analysis.activities");

    await expect(
      extractFacts({
        researchId: "r1",
        competitor: "Stripe",
        sources: [
          {
            id: "s1",
            researchId: "r1",
            competitor: "Stripe",
            title: "Stripe Pricing",
            url: "https://stripe.com/pricing",
            domain: "stripe.com",
            sourceType: "primary",
            searchCategory: "pricing",
            createdAt: new Date().toISOString(),
          },
        ],
      }),
    ).rejects.toMatchObject({ name: "NonRetryableError" });
  });

  it("returns an empty array without calling the model when there are no sources", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({ facts: [{ fact: "should not appear", sourceIds: [], category: "overview" }] });

    const { extractFacts } = await import("./analysis.activities");
    const result = await extractFacts({ researchId: "r1", competitor: "Stripe", sources: [] });

    expect(result).toEqual([]);
  });

  it("drops facts that cite a sourceId not present in the input sources", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({
      facts: [
        { fact: "real fact", sourceIds: ["s1"], category: "pricing" },
        { fact: "hallucinated fact", sourceIds: ["does-not-exist"], category: "pricing" },
      ],
    });

    const { extractFacts } = await import("./analysis.activities");
    const result = await extractFacts({
      researchId: "r1",
      competitor: "Stripe",
      sources: [
        {
          id: "s1",
          researchId: "r1",
          competitor: "Stripe",
          title: "Stripe Pricing",
          url: "https://stripe.com/pricing",
          domain: "stripe.com",
          sourceType: "primary",
          searchCategory: "pricing",
          createdAt: new Date().toISOString(),
        },
      ],
    });

    expect(result).toEqual([{ fact: "real fact", sourceIds: ["s1"], category: "pricing" }]);
  });
});

describe("analyzeCompetitor", () => {
  it("returns Insufficient evidence without calling the model when there are no facts", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({ overview: "should not appear", strengths: [], weaknesses: [] });

    const { analyzeCompetitor } = await import("./analysis.activities");
    const result = await analyzeCompetitor({ researchId: "r1", competitor: "Stripe", facts: [] });

    expect(result).toEqual({ overview: "Insufficient evidence.", strengths: [], weaknesses: [] });
  });
});

describe("analyzePricing", () => {
  it("returns Insufficient evidence without calling the model when there is no pricing data", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({ summary: "should not appear", model: "should not appear", details: [] });

    const { analyzePricing } = await import("./analysis.activities");
    const result = await analyzePricing({ competitor: "Stripe", sources: [], facts: [] });

    expect(result).toEqual({ summary: "Insufficient evidence.", model: "Insufficient evidence.", details: [] });
  });
});
