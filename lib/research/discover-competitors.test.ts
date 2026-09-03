import { describe, expect, it } from "vitest";

import { discoverCompetitorsFromResults } from "./discover-competitors";

describe("discoverCompetitorsFromResults", () => {
  it("derives title-cased company names from result domains", () => {
    const competitors = discoverCompetitorsFromResults([
      { url: "https://stripe.com/pricing" },
      { url: "https://www.adyen.com/about" },
      { url: "https://paddle.com" },
    ]);
    expect(competitors).toEqual(["Stripe", "Adyen", "Paddle"]);
  });

  it("skips known non-company domains", () => {
    const competitors = discoverCompetitorsFromResults([
      { url: "https://en.wikipedia.org/wiki/Stripe" },
      { url: "https://techcrunch.com/stripe-news" },
      { url: "https://stripe.com" },
    ]);
    expect(competitors).toEqual(["Stripe"]);
  });

  it("dedupes and caps at maxCompetitors", () => {
    const competitors = discoverCompetitorsFromResults(
      [
        { url: "https://stripe.com/a" },
        { url: "https://stripe.com/b" },
        { url: "https://adyen.com" },
        { url: "https://paddle.com" },
        { url: "https://braintreepayments.com" },
        { url: "https://checkout.com" },
      ],
      3
    );
    expect(competitors).toHaveLength(3);
  });

  it("skips malformed URLs without throwing", () => {
    expect(() => discoverCompetitorsFromResults([{ url: "not-a-url" }])).not.toThrow();
  });
});
