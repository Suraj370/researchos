import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiKey = process.env.EXA_API_KEY;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("exa-js");
  if (originalApiKey === undefined) {
    delete process.env.EXA_API_KEY;
  } else {
    process.env.EXA_API_KEY = originalApiKey;
  }
});

describe("searchCompetitors", () => {
  it("uses explicit extraction and never calls Exa when the query names competitors", async () => {
    delete process.env.EXA_API_KEY;
    vi.resetModules();

    const { searchCompetitors } = await import("./competitors.activities");
    const result = await searchCompetitors({
      researchId: "r1",
      query: "Compare Stripe, Adyen, and Paddle for a SaaS startup.",
    });

    expect(result).toEqual({ competitors: ["Stripe", "Adyen", "Paddle"], source: "explicit" });
  });

  it("falls back to Exa discovery when no explicit competitors are named", async () => {
    process.env.EXA_API_KEY = "test-key";
    vi.resetModules();

    vi.doMock("exa-js", () => ({
      default: class MockExa {
        search = vi.fn().mockResolvedValue({
          results: [{ url: "https://stripe.com" }, { url: "https://adyen.com" }],
        });
      },
    }));

    const { searchCompetitors } = await import("./competitors.activities");
    const result = await searchCompetitors({
      researchId: "r1",
      query: "best payment processors for startups",
    });

    expect(result).toEqual({ competitors: ["Stripe", "Adyen"], source: "exa-discovery" });
  });
});
