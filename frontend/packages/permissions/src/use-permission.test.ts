import { renderHook, act } from "@testing-library/react";
import { PermissionType, PermissionStatus } from "./types";
import * as store from "./permission-store";
import { usePermission } from "./use-permission";

const mockCheckPermission = jest.fn();

jest.mock("./platform/check-permission", () => ({
  checkPermission: (...args: unknown[]) => mockCheckPermission(...args),
}));

jest.mock("./platform/request-permission", () => ({
  requestPermission: jest.fn().mockResolvedValue({
    type: "camera",
    status: "unknown",
  }),
}));

jest.mock("./platform/open-settings", () => ({
  openSettings: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  mockCheckPermission.mockResolvedValue({
    type: PermissionType.Camera,
    status: PermissionStatus.Unknown,
  });
});

describe("usePermission initial state", () => {
  it("returns initial status from store", () => {
    const { result } = renderHook(() =>
      usePermission(PermissionType.Camera),
    );
    expect(result.current.status).toBe(PermissionStatus.Unknown);
  });

  it("calls check on mount", () => {
    renderHook(() => usePermission(PermissionType.Camera));
    expect(mockCheckPermission).toHaveBeenCalledWith(PermissionType.Camera);
  });
});

describe("usePermission reactivity", () => {
  it("updates status when store changes", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Unknown,
    });

    const { result } = renderHook(() =>
      usePermission(PermissionType.Camera),
    );

    // Wait for mount check to resolve
    await act(async () => {
      await Promise.resolve();
    });

    // Now update the store
    act(() => {
      store.update({
        type: PermissionType.Camera,
        status: PermissionStatus.Granted,
      });
    });

    expect(result.current.status).toBe(PermissionStatus.Granted);
    expect(result.current.isGranted).toBe(true);
  });
});

describe("usePermission filtering", () => {
  it("ignores updates for other permission types", async () => {
    const { result } = renderHook(() =>
      usePermission(PermissionType.Camera),
    );

    await act(async () => { await Promise.resolve(); });

    act(() => {
      store.update({
        type: PermissionType.Microphone,
        status: PermissionStatus.Granted,
      });
    });

    expect(result.current.status).toBe(PermissionStatus.Unknown);
  });
});

describe("usePermission boolean helpers", () => {
  it("exposes isPermanentlyDenied correctly", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.PermanentlyDenied,
    });

    const { result } = renderHook(() =>
      usePermission(PermissionType.Camera),
    );

    expect(result.current.isPermanentlyDenied).toBe(true);
    expect(result.current.isGranted).toBe(false);
    expect(result.current.isLimited).toBe(false);
  });
});
