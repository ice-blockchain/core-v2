import { describe, it, expect } from "vitest";

describe("CreatorRow", () => {
  it("exports a function component", async () => {
    const mod = await import("./CreatorRow");
    expect(typeof mod.CreatorRow).toBe("function");
  });

  it("exports CreatorRowProps interface", async () => {
    const mod = await import("./CreatorRow");
    expect(mod).toHaveProperty("CreatorRow");
  });
});

describe("CreatorRowSkeleton", () => {
  it("exports CreatorRowSkeletonList component", async () => {
    const mod = await import("./CreatorRowSkeleton");
    expect(typeof mod.CreatorRowSkeletonList).toBe("function");
  });
});

describe("OnboardingScreenTitle", () => {
  it("exports a function component", async () => {
    const mod = await import("./OnboardingScreenTitle");
    expect(typeof mod.OnboardingScreenTitle).toBe("function");
  });
});
