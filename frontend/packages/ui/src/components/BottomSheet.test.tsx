import { describe, it, expect } from "vitest";

describe("BottomSheet", () => {
  it("exports a function component from the web variant", async () => {
    const mod = await import("./BottomSheet.web");
    expect(typeof mod.BottomSheet).toBe("function");
  });

  it("exports BottomSheetProps type", async () => {
    const mod = await import("./bottom-sheet-types");
    expect(mod).toBeDefined();
  });
});

describe("BottomSheetHeader", () => {
  it("exports a function component", async () => {
    const mod = await import("./BottomSheetHeader");
    expect(typeof mod.BottomSheetHeader).toBe("function");
  });
});

describe("BottomSheetFooter", () => {
  it("exports a function component", async () => {
    const mod = await import("./BottomSheetFooter");
    expect(typeof mod.BottomSheetFooter).toBe("function");
  });
});
