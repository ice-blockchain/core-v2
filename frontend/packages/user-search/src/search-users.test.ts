import { describe, it, expect } from "vitest";
import { searchUsers } from "./search-users";

describe("searchUsers", () => {
  it("returns all users when query is empty", async () => {
    const result = await searchUsers({ query: "", page: 0, pageSize: 200 });
    expect(result.users.length).toBeGreaterThan(0);
    expect(result.hasMore).toBe(false);
  });

  it("filters users by display name", async () => {
    const result = await searchUsers({ query: "Alina", page: 0 });
    expect(result.users).toHaveLength(1);
    expect(result.users[0]!.displayName).toBe("Alina Proxima");
  });

  it("filters users by username", async () => {
    const result = await searchUsers({ query: "curtiswashington", page: 0 });
    expect(result.users).toHaveLength(1);
    expect(result.users[0]!.username).toBe("curtiswashington");
  });

  it("returns empty array when no match found", async () => {
    const result = await searchUsers({ query: "zzzznotfound", page: 0 });
    expect(result.users).toHaveLength(0);
    expect(result.hasMore).toBe(false);
  });

  it("paginates results correctly", async () => {
    const page0 = await searchUsers({ query: "", page: 0, pageSize: 5 });
    expect(page0.users).toHaveLength(5);
    expect(page0.hasMore).toBe(true);

    const page1 = await searchUsers({ query: "", page: 1, pageSize: 5 });
    expect(page1.users).toHaveLength(5);
    expect(page1.users[0]!.id).not.toBe(page0.users[0]!.id);
  });

  it("case-insensitive search", async () => {
    const result = await searchUsers({ query: "alina", page: 0 });
    expect(result.users).toHaveLength(1);
    expect(result.users[0]!.displayName).toBe("Alina Proxima");
  });
});
