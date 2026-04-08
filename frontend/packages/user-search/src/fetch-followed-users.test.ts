import { describe, it, expect } from "vitest";
import { fetchFollowedUsers } from "./fetch-followed-users";

describe("fetchFollowedUsers", () => {
  it("returns followed users for first page", async () => {
    const result = await fetchFollowedUsers({ page: 0 });
    expect(result.users.length).toBeGreaterThan(0);
    expect(result.users[0]!).toHaveProperty("id");
    expect(result.users[0]!).toHaveProperty("username");
    expect(result.users[0]!).toHaveProperty("displayName");
  });

  it("paginates correctly with custom page size", async () => {
    const page0 = await fetchFollowedUsers({ page: 0, pageSize: 3 });
    expect(page0.users).toHaveLength(3);
    expect(page0.hasMore).toBe(true);

    const page1 = await fetchFollowedUsers({ page: 1, pageSize: 3 });
    expect(page1.users).toHaveLength(3);
    expect(page1.users[0]!.id).not.toBe(page0.users[0]!.id);
  });

  it("returns empty when page is beyond data", async () => {
    const result = await fetchFollowedUsers({ page: 100, pageSize: 10 });
    expect(result.users).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });
});
