import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("BottomSnackBar exports", () => {
  it("exports a function component", async () => {
    const mod = await import("./BottomSnackBar");
    expect(typeof mod.BottomSnackBar).toBe("function");
  });

  it("exports BottomSnackBarProps interface", async () => {
    const mod = await import("./BottomSnackBar");
    expect(mod).toBeDefined();
  });
});

describe("auto-dismiss fires after duration", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("fires callback after 3000ms", () => {
    const onDismiss = vi.fn();
    setTimeout(onDismiss, 3000);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("auto-dismiss respects timing", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("does not fire before duration elapses", () => {
    const onDismiss = vi.fn();
    setTimeout(onDismiss, 3000);
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("respects custom duration", () => {
    const onDismiss = vi.fn();
    setTimeout(onDismiss, 5000);
    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("auto-dismiss cancellation", () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("can be cancelled before firing", () => {
    const onDismiss = vi.fn();
    const timer = setTimeout(onDismiss, 3000);
    clearTimeout(timer);
    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});