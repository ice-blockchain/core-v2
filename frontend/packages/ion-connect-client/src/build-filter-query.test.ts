import { describe, it, expect } from "vitest";
import { buildFilterQuery } from "./build-filter-query";

describe("buildFilterQuery", () => {
  it("builds query with no filters", () => {
    const { sql, params } = buildFilterQuery({});
    expect(sql).toContain("SELECT DISTINCT e.* FROM events e");
    expect(sql).toContain("ORDER BY e.created_at DESC");
    expect(params).toEqual([]);
  });

  it("filters by ids", () => {
    const { sql, params } = buildFilterQuery({ ids: ["abc", "def"] });
    expect(sql).toContain("e.id IN (?, ?)");
    expect(params).toEqual(["abc", "def"]);
  });

  it("filters by authors", () => {
    const { sql, params } = buildFilterQuery({ authors: ["pk1"] });
    expect(sql).toContain("e.pubkey IN (?)");
    expect(params).toEqual(["pk1"]);
  });

  it("filters by kinds", () => {
    const { sql, params } = buildFilterQuery({ kinds: [1, 7] });
    expect(sql).toContain("e.kind IN (?, ?)");
    expect(params).toEqual([1, 7]);
  });

  it("filters by time range", () => {
    const { sql, params } = buildFilterQuery({
      since: 1000,
      until: 2000,
    });
    expect(sql).toContain("e.created_at >= ?");
    expect(sql).toContain("e.created_at <= ?");
    expect(params).toEqual([1000, 2000]);
  });

  it("applies limit", () => {
    const { sql } = buildFilterQuery({ limit: 25 });
    expect(sql).toContain("LIMIT 25");
  });

  it("filters by tag values via JOIN", () => {
    const { sql, params } = buildFilterQuery({
      "#p": ["pubkey1", "pubkey2"],
    });
    expect(sql).toContain("JOIN event_tags_index t0");
    expect(sql).toContain("t0.tag_name = ?");
    expect(sql).toContain("t0.tag_value IN (?, ?)");
    expect(params).toEqual(["p", "pubkey1", "pubkey2"]);
  });

  it("supports multiple tag filters", () => {
    const { sql, params } = buildFilterQuery({
      "#e": ["eid1"],
      "#p": ["pk1"],
    });
    expect(sql).toContain("JOIN event_tags_index t0");
    expect(sql).toContain("JOIN event_tags_index t1");
    expect(params).toContain("e");
    expect(params).toContain("p");
  });

  it("combines all filter types", () => {
    const { sql, params } = buildFilterQuery({
      authors: ["pk1"],
      kinds: [1],
      since: 100,
      "#p": ["pk2"],
      limit: 10,
    });
    expect(sql).toContain("e.pubkey IN (?)");
    expect(sql).toContain("e.kind IN (?)");
    expect(sql).toContain("e.created_at >= ?");
    expect(sql).toContain("JOIN event_tags_index t0");
    expect(sql).toContain("LIMIT 10");
    expect(params).toEqual(["pk1", 1, 100, "p", "pk2"]);
  });
});
