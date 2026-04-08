// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTabPager } from "./use-tab-pager";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

function createScrollEvent(x: number): NativeSyntheticEvent<NativeScrollEvent> {
  return { nativeEvent: { contentOffset: { x, y: 0 } } } as NativeSyntheticEvent<NativeScrollEvent>;
}

describe("useTabPager", () => {
  it("stores page width via onLayout", () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() => useTabPager(onTabChange));

    act(() => result.current.onLayout(375));

    const event = createScrollEvent(375);
    act(() => result.current.onScrollEnd(event));
    expect(onTabChange).toHaveBeenCalledWith("nfts");
  });

  it("scrollToTab coins scrolls to x=0", () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() => useTabPager(onTabChange));

    const scrollTo = vi.fn();
    (result.current.scrollRef as { current: unknown }).current = { scrollTo };

    act(() => result.current.onLayout(375));
    act(() => result.current.scrollToTab("coins"));
    expect(scrollTo).toHaveBeenCalledWith({ x: 0, animated: true });
  });

  it("scrollToTab nfts scrolls to page width offset", () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() => useTabPager(onTabChange));

    const scrollTo = vi.fn();
    (result.current.scrollRef as { current: unknown }).current = { scrollTo };

    act(() => result.current.onLayout(375));
    act(() => result.current.scrollToTab("nfts"));
    expect(scrollTo).toHaveBeenCalledWith({ x: 375, animated: true });
  });

  it("onScrollEnd calculates coins tab from scroll offset", () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() => useTabPager(onTabChange));

    act(() => result.current.onLayout(375));

    const event = createScrollEvent(10);
    act(() => result.current.onScrollEnd(event));
    expect(onTabChange).toHaveBeenCalledWith("coins");
  });

  it("onScrollEnd does nothing when pageWidth is 0", () => {
    const onTabChange = vi.fn();
    const { result } = renderHook(() => useTabPager(onTabChange));

    const event = createScrollEvent(100);
    act(() => result.current.onScrollEnd(event));
    expect(onTabChange).not.toHaveBeenCalled();
  });
});
