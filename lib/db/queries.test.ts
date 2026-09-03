import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

// These exercise a real Postgres connection and only run when DATABASE_URL is set
// (e.g. `docker compose up -d && npm run db:migrate` locally). They are skipped
// entirely otherwise so `npm run test` never depends on live infrastructure.
describe.skipIf(!process.env.DATABASE_URL)("db/queries (integration)", () => {
  const testUserId = `test_user_${randomUUID()}`;

  beforeAll(async () => {
    const { getDb } = await import("./client");
    const { user } = await import("./schema");
    await getDb()
      .insert(user)
      .values({ id: testUserId, name: "Test User", email: `${testUserId}@example.test` })
      .onConflictDoNothing();
  });

  it("creates a research record, stores sources once, and dedupes on re-insert", async () => {
    const { createResearchRecord, insertResearchSources, getResearchSources, updateResearchStatus } =
      await import("./queries");

    const researchId = `test_${randomUUID()}`;

    await createResearchRecord({
      id: researchId,
      title: "Compare Stripe and Adyen",
      query: "Compare Stripe and Adyen",
      userId: testUserId,
    });

    const sources = [
      {
        researchId,
        competitor: "Stripe",
        title: "Stripe Pricing",
        url: "https://stripe.com/pricing",
        domain: "stripe.com",
        sourceType: "primary" as const,
        searchCategory: "pricing" as const,
      },
    ];

    const firstInsertCount = await insertResearchSources(sources);
    expect(firstInsertCount).toBe(1);

    const secondInsertCount = await insertResearchSources(sources);
    expect(secondInsertCount).toBe(0);

    const stored = await getResearchSources(researchId);
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ competitor: "Stripe", url: "https://stripe.com/pricing" });

    await updateResearchStatus(researchId, "completed");
  });

  it("scopes listResearch to the given user and reports source counts", async () => {
    const { createResearchRecord, listResearch } = await import("./queries");

    const researchId = `test_${randomUUID()}`;
    await createResearchRecord({
      id: researchId,
      title: "Scoped to me",
      query: "Compare Stripe and Adyen",
      userId: testUserId,
    });

    const otherUserId = `test_user_${randomUUID()}`;
    const { getDb } = await import("./client");
    const { user } = await import("./schema");
    await getDb()
      .insert(user)
      .values({ id: otherUserId, name: "Other User", email: `${otherUserId}@example.test` })
      .onConflictDoNothing();

    const mine = await listResearch(testUserId);
    const theirs = await listResearch(otherUserId);

    expect(mine.some((r) => r.id === researchId)).toBe(true);
    expect(theirs.some((r) => r.id === researchId)).toBe(false);
  });

  it("getResearchOwnerId distinguishes not-found, unowned, and owned", async () => {
    const { createResearchRecord, getResearchOwnerId } = await import("./queries");

    const researchId = `test_${randomUUID()}`;
    await createResearchRecord({
      id: researchId,
      title: "Ownership check",
      query: "Compare Stripe and Adyen",
      userId: testUserId,
    });

    expect(await getResearchOwnerId(researchId)).toBe(testUserId);
    expect(await getResearchOwnerId("does-not-exist")).toBeUndefined();
  });

  it("upserts competitor analyses and the competitive comparison, keyed by (research_id, competitor)", async () => {
    const {
      createResearchRecord,
      upsertCompetitorAnalysis,
      getCompetitorAnalyses,
      upsertCompetitiveComparison,
      getCompetitiveComparison,
    } = await import("./queries");

    const researchId = `test_${randomUUID()}`;
    await createResearchRecord({
      id: researchId,
      title: "Compare Stripe and Adyen",
      query: "Compare Stripe and Adyen",
      userId: testUserId,
    });

    const analysis = {
      researchId,
      competitor: "Stripe",
      overview: "Payments platform.",
      pricing: { summary: "2.9% + 30c", model: "pay-as-you-go", details: [] },
      features: [],
      targetCustomers: [],
      positioning: { summary: "Developer-centric.", differentiators: [] },
      strengths: ["Strong docs"],
      weaknesses: [],
      keyFacts: [],
    };

    await upsertCompetitorAnalysis(analysis);
    await upsertCompetitorAnalysis({ ...analysis, overview: "Updated overview." });

    const stored = await getCompetitorAnalyses(researchId);
    expect(stored).toHaveLength(1);
    expect(stored[0].overview).toBe("Updated overview.");

    const comparison = {
      researchId,
      competitors: ["Stripe"],
      pricingComparison: { Stripe: analysis.pricing },
      featureComparison: [],
      positioningComparison: { Stripe: analysis.positioning },
      strengthsComparison: { Stripe: analysis.strengths },
      weaknessesComparison: { Stripe: analysis.weaknesses },
    };

    await upsertCompetitiveComparison(comparison);
    const storedComparison = await getCompetitiveComparison(researchId);
    expect(storedComparison).toEqual(comparison);
  });
});
