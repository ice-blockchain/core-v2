import {
  PermissionType,
  PermissionStatus,
  type PermissionResult,
} from "./types";
import * as store from "./permission-store";

const mockCheckPermission = jest.fn<Promise<PermissionResult>, [PermissionType]>();
const mockRequestPermission = jest.fn<Promise<PermissionResult>, [PermissionType]>();
const mockOpenSettings = jest.fn<Promise<void>, []>();

jest.mock("./platform/check-permission", () => ({
  checkPermission: (...args: [PermissionType]) => mockCheckPermission(...args),
}));

jest.mock("./platform/request-permission", () => ({
  requestPermission: (...args: [PermissionType]) => mockRequestPermission(...args),
}));

jest.mock("./platform/open-settings", () => ({
  openSettings: () => mockOpenSettings(),
}));

import { Permissions } from "./permissions";

beforeEach(() => {
  jest.clearAllMocks();
  store.clear();
  Permissions.initialize();
});

describe("Permissions check", () => {
  it("delegates to platform check and updates store", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const result = await Permissions.check(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(Permissions.getStatus(PermissionType.Camera)).toBe(
      PermissionStatus.Granted,
    );
  });
});

describe("Permissions request basic", () => {
  it("delegates to platform request and updates store", async () => {
    mockRequestPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const result = await Permissions.request(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(Permissions.isGranted(PermissionType.Camera)).toBe(true);
  });

  it("allows new request after previous completes", async () => {
    mockRequestPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    await Permissions.request(PermissionType.Camera);
    await Permissions.request(PermissionType.Camera);
    expect(mockRequestPermission).toHaveBeenCalledTimes(2);
  });
});

describe("Permissions request dedup", () => {
  it("deduplicates concurrent requests for same type", async () => {
    mockRequestPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const [first, second] = await Promise.all([
      Permissions.request(PermissionType.Camera),
      Permissions.request(PermissionType.Camera),
    ]);
    expect(first.status).toBe(PermissionStatus.Granted);
    expect(second.status).toBe(PermissionStatus.Granted);
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });
});

describe("Permissions ensurePermission granted path", () => {
  it("returns immediately when already Granted", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const result = await Permissions.ensurePermission(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });

  it("returns immediately when Limited", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Photos,
      status: PermissionStatus.Limited,
    });
    const result = await Permissions.ensurePermission(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.Limited);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});

describe("Permissions ensurePermission re-request", () => {
  it("requests permission when Denied", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Denied,
    });
    mockRequestPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const result = await Permissions.ensurePermission(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(mockRequestPermission).toHaveBeenCalled();
  });
});

describe("Permissions ensurePermission settings redirect", () => {
  it("opens settings when PermanentlyDenied", async () => {
    mockCheckPermission
      .mockResolvedValueOnce({
        type: PermissionType.Camera,
        status: PermissionStatus.PermanentlyDenied,
      })
      .mockResolvedValue({
        type: PermissionType.Camera,
        status: PermissionStatus.Granted,
      });
    mockOpenSettings.mockResolvedValue(undefined);
    const result = await Permissions.ensurePermission(PermissionType.Camera);
    expect(mockOpenSettings).toHaveBeenCalled();
    expect(result.type).toBe(PermissionType.Camera);
  });
});

describe("Permissions ensurePermission terminal", () => {
  it("returns as-is when Restricted", async () => {
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Restricted,
    });
    const result = await Permissions.ensurePermission(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Restricted);
    expect(mockRequestPermission).not.toHaveBeenCalled();
  });
});

describe("Permissions boolean helpers", () => {
  it("isGranted returns true when Granted", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    expect(Permissions.isGranted(PermissionType.Camera)).toBe(true);
    expect(Permissions.isDenied(PermissionType.Camera)).toBe(false);
  });

  it("isLimited returns true when Limited", () => {
    store.update({
      type: PermissionType.Photos,
      status: PermissionStatus.Limited,
    });
    expect(Permissions.isLimited(PermissionType.Photos)).toBe(true);
  });

  it("isPermanentlyDenied returns true when blocked", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.PermanentlyDenied,
    });
    expect(Permissions.isPermanentlyDenied(PermissionType.Camera)).toBe(true);
  });
});

describe("Permissions subscribe and checkAll", () => {
  it("notifies on permission changes", async () => {
    const listener = jest.fn();
    Permissions.subscribe(listener);
    mockCheckPermission.mockResolvedValue({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    await Permissions.check(PermissionType.Camera);
    expect(listener).toHaveBeenCalledWith({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
  });

  it("checks all tracked types", async () => {
    mockCheckPermission.mockImplementation(
      async (type: PermissionType) => ({
        type,
        status: PermissionStatus.Granted,
      }),
    );
    const results = await Permissions.checkAll();
    expect(results.size).toBe(Object.values(PermissionType).length);
  });
});

describe("Permissions initialize config", () => {
  it("tracks only specified types when configured", async () => {
    Permissions.initialize({
      types: [PermissionType.Camera, PermissionType.Microphone],
    });
    mockCheckPermission.mockImplementation(
      async (type: PermissionType) => ({
        type,
        status: PermissionStatus.Granted,
      }),
    );
    const results = await Permissions.checkAll();
    expect(results.size).toBe(2);
  });
});
