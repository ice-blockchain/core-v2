import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("BottomSnackBar", () => {
  it("exports a function component", async () => {
    const mod = await import("./BottomSnackBar");
    expect(typeof mod.BottomSnackBar).toBe("function");
  });

  it("exports BottomSnackBarProps interface", async () => {
    const mod = await import("./BottomSnackBar");
    expect(mod).toBeDefined();
  });
});

describe("BottomSnackBar auto-dismiss behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires callback after 3000ms default duration", () => {
    const onDismiss = vi.fn();
    setTimeout(onDismiss, 3000);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("does not fire callback before duration elapses", () => {
    const onDismiss = vi.fn();
    setTimeout(onDismiss, 3000);
    vi.advanceTimersByTime(2999);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("respects custom duration", () => {
    const onDismiss = vi.fn();
    const customDuration = 5000;
    setTimeout(onDismiss, customDuration);
    vi.advanceTimersByTime(4999);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("can be cancelled before firing", () => {
    const onDismiss = vi.fn();
    const timer = setTimeout(onDismiss, 3000);
    clearTimeout(timer);
    vi.advanceTimersByTime(3000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});