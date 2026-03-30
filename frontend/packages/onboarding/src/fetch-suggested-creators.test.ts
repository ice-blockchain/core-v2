import { describe, it, expect } from "vitest";
import { fetchSuggestedCreators } from "./fetch-suggested-creators";

describe("fetchSuggestedCreators", () => {
  it("returns creators for page 0", async () => {
    const result = await fetchSuggestedCreators({ page: 0 });
    expect(result.creators.length).toBeGreaterThan(0);
    expect(result.creators[0]).toHaveProperty("id");
    expect(result.creators[0]).toHaveProperty("name");
    expect(result.creators[0]).toHaveProperty("handle");
    expect(result.creators[0]).toHaveProperty("isVerified");
  });

  it("returns hasMore false when no more pages", async () => {
    const result = await fetchSuggestedCreators({ page: 100 });
    expect(result.creators).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("returns creators with required fields", async () => {
    const result = await fetchSuggestedCreators({ page: 0 });
    for (const creator of result.creators) {
      expect(typeof creator.id).toBe("string");
      expect(typeof creator.name).toBe("string");
      expect(typeof creator.handle).toBe("string");
      expect(typeof creator.isVerified).toBe("boolean");
    }
  });
});
