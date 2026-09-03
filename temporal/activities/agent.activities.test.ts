import { afterEach, describe, expect, it, vi } from "vitest";

const originalApiKey = process.env.OPENAI_API_KEY;

afterEach(() => {
  vi.resetModules();
  vi.doUnmock("openai");
  vi.doUnmock("../../lib/db/queries");
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

function mockSources(sources: Array<{ id: string; competitor: string; searchCategory: string }>) {
  vi.doMock("../../lib/db/queries", () => ({
    getResearchSources: vi.fn().mockResolvedValue(
      sources.map((s) => ({
        ...s,
        researchId: "r1",
        title: "Title",
        url: `https://example.com/${s.id}`,
        domain: "example.com",
        sourceType: "primary",
        createdAt: new Date().toISOString(),
      })),
    ),
  }));
}

describe("createResearchPlan", () => {
  it("throws clearly (so Temporal can retry) when the model returns no parseable response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI(null);

    const { createResearchPlan } = await import("./agent.activities");

    await expect(
      createResearchPlan({ researchId: "r1", query: "Compare Notion", competitors: ["Notion"] }),
    ).rejects.toThrow(/no parseable/i);
  });

  it("produces a plan grounded in the provided competitors", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({
      competitors: ["Notion", "Airtable"],
      objectives: ["Compare pricing and features for a 50-person team"],
      searchCategories: ["pricing", "features"],
      initialQueries: [
        { competitor: "Notion", category: "pricing", query: "Notion pricing official", objective: "pricing" },
        { competitor: "Airtable", category: "pricing", query: "Airtable pricing official", objective: "pricing" },
      ],
    });

    const { createResearchPlan } = await import("./agent.activities");
    const plan = await createResearchPlan({
      researchId: "r1",
      query: "Compare Notion and Airtable",
      competitors: ["Notion", "Airtable"],
    });

    expect(plan.competitors).toEqual(["Notion", "Airtable"]);
    expect(plan.initialQueries).toHaveLength(2);
  });

  it("drops queries for competitors the model invented that weren't in the input list", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({
      competitors: ["Notion"],
      objectives: ["Compare pricing"],
      searchCategories: ["pricing"],
      initialQueries: [
        { competitor: "Notion", category: "pricing", query: "Notion pricing", objective: "pricing" },
        { competitor: "Hallucinated Inc", category: "pricing", query: "Hallucinated Inc pricing", objective: "x" },
      ],
    });

    const { createResearchPlan } = await import("./agent.activities");
    const plan = await createResearchPlan({
      researchId: "r1",
      query: "Compare Notion",
      competitors: ["Notion"],
    });

    expect(plan.initialQueries).toHaveLength(1);
    expect(plan.initialQueries[0].competitor).toBe("Notion");
  });

  it("falls back to the discovered competitor list when the model invents an unknown one", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({
      competitors: ["Nonexistent Co"],
      objectives: [],
      searchCategories: [],
      initialQueries: [],
    });

    const { createResearchPlan } = await import("./agent.activities");

    // The model's competitor list is filtered against the input; when nothing
    // survives that filter, the activity falls back to the discovered list
    // rather than throwing - only a genuinely empty input list should throw.
    const plan = await createResearchPlan({ researchId: "r1", query: "q", competitors: ["Notion"] });
    expect(plan.competitors).toEqual(["Notion"]);
  });

  it("throws clearly when there are no competitors to plan for at all", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockOpenAI({ competitors: [], objectives: [], searchCategories: [], initialQueries: [] });

    const { createResearchPlan } = await import("./agent.activities");

    await expect(createResearchPlan({ researchId: "r1", query: "q", competitors: [] })).rejects.toThrow(
      "createResearchPlan produced no valid competitors",
    );
  });
});

describe("decideNextSearches", () => {
  it("returns no searches when the model judges evidence sufficient", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockSources([{ id: "s1", competitor: "Notion", searchCategory: "pricing" }]);
    mockOpenAI({ sufficient: true, reason: "Evidence looks solid", searches: [], missingAreas: [] });

    const { decideNextSearches } = await import("./agent.activities");
    const decision = await decideNextSearches({
      researchId: "r1",
      query: "Compare Notion",
      competitors: ["Notion"],
      categories: ["pricing"],
      previousQueries: ["notion pricing"],
      missingAreas: [],
      iteration: 1,
      maxIterations: 5,
    });

    expect(decision.sufficient).toBe(true);
    expect(decision.searches).toEqual([]);
  });

  it("proposes targeted searches and reports missing areas when insufficient", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockSources([{ id: "s1", competitor: "Notion", searchCategory: "features" }]);
    mockOpenAI({
      sufficient: false,
      reason: "Pricing evidence is missing for Notion",
      searches: [
        { competitor: "Notion", category: "pricing", query: "Notion pricing official", objective: "find pricing" },
      ],
      missingAreas: ["Notion pricing"],
    });

    const { decideNextSearches } = await import("./agent.activities");
    const decision = await decideNextSearches({
      researchId: "r1",
      query: "Compare Notion",
      competitors: ["Notion"],
      categories: ["pricing", "features"],
      previousQueries: [],
      missingAreas: [],
      iteration: 1,
      maxIterations: 5,
    });

    expect(decision.sufficient).toBe(false);
    expect(decision.searches).toHaveLength(1);
    expect(decision.missingAreas).toEqual(["Notion pricing"]);
  });

  it("drops proposed searches for competitors outside the known list", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockSources([]);
    mockOpenAI({
      sufficient: false,
      reason: "need more",
      searches: [
        { competitor: "Made Up Co", category: "pricing", query: "Made Up Co pricing", objective: "x" },
      ],
      missingAreas: [],
    });

    const { decideNextSearches } = await import("./agent.activities");
    const decision = await decideNextSearches({
      researchId: "r1",
      query: "Compare Notion",
      competitors: ["Notion"],
      categories: ["pricing"],
      previousQueries: [],
      missingAreas: [],
      iteration: 1,
      maxIterations: 5,
    });

    expect(decision.searches).toEqual([]);
  });
});

describe("evaluateResearch", () => {
  it("overrides a sufficient=true verdict when a competitor has zero sources", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockSources([{ id: "s1", competitor: "Notion", searchCategory: "pricing" }]);
    mockOpenAI({ sufficient: true, coverageScore: 0.9, missingAreas: [], explanation: "looks good" });

    const { evaluateResearch } = await import("./agent.activities");
    const evaluation = await evaluateResearch({
      researchId: "r1",
      query: "Compare Notion and Airtable",
      competitors: ["Notion", "Airtable"],
      categories: ["pricing"],
      executedSearchCount: 2,
      uniqueSearchCount: 2,
      iteration: 1,
    });

    expect(evaluation.sufficient).toBe(false);
    expect(evaluation.missingAreas.some((area) => area.includes("Airtable"))).toBe(true);
  });

  it("trusts a sufficient=true verdict when every competitor has evidence", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    vi.resetModules();
    mockSources([
      { id: "s1", competitor: "Notion", searchCategory: "pricing" },
      { id: "s2", competitor: "Airtable", searchCategory: "pricing" },
    ]);
    mockOpenAI({ sufficient: true, coverageScore: 0.9, missingAreas: [], explanation: "looks good" });

    const { evaluateResearch } = await import("./agent.activities");
    const evaluation = await evaluateResearch({
      researchId: "r1",
      query: "Compare Notion and Airtable",
      competitors: ["Notion", "Airtable"],
      categories: ["pricing"],
      executedSearchCount: 2,
      uniqueSearchCount: 2,
      iteration: 1,
    });

    expect(evaluation.sufficient).toBe(true);
    expect(evaluation.missingAreas).toEqual([]);
  });
});
