import { describe, it, expect } from "vitest";
import { buildSearchText } from "./build-search-text";
import type { NostrEvent } from "./types";

function makeEvent(overrides: Partial<NostrEvent>): NostrEvent {
  return {
    id: "test-id",
    pubkey: "test-pubkey",
    created_at: 1000,
    kind: 1,
    content: "",
    sig: "test-sig",
    tags: [],
    ...overrides,
  };
}

describe("buildSearchText", () => {
  it("extracts display_name, name, about from kind 0", () => {
    const event = makeEvent({
      kind: 0,
      content: JSON.stringify({
        display_name: "Alice",
        name: "alice",
        about: "A nostr user",
      }),
    });
    expect(buildSearchText(event)).toBe("Alice alice A nostr user");
  });

  it("returns null for kind 0 with invalid JSON", () => {
    const event = makeEvent({ kind: 0, content: "not json" });
    expect(buildSearchText(event)).toBeNull();
  });

  it("returns content for kind 1", () => {
    const event = makeEvent({ kind: 1, content: "Hello world" });
    expect(buildSearchText(event)).toBe("Hello world");
  });

  it("includes title tag for kind 30023", () => {
    const event = makeEvent({
      kind: 30023,
      content: "Article body",
      tags: [["title", "My Article"]],
    });
    expect(buildSearchText(event)).toBe("My Article Article body");
  });

  it("returns null for unsupported kinds", () => {
    const event = makeEvent({ kind: 7, content: "+" });
    expect(buildSearchText(event)).toBeNull();
  });

  it("returns null for kind 0 with empty profile", () => {
    const event = makeEvent({
      kind: 0,
      content: JSON.stringify({}),
    });
    expect(buildSearchText(event)).toBeNull();
  });
});
