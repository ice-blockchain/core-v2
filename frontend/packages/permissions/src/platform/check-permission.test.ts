import { PermissionType, PermissionStatus } from "../types";

const mockCheck = jest.fn();

jest.mock("./map-native-status", () => ({
  mapNativeStatus: (status: string) => {
    const map: Record<string, string> = {
      granted: "granted",
      denied: "denied",
      blocked: "blocked",
      limited: "limited",
      unavailable: "not_available",
      prompt: "denied",
    };
    return map[status] ?? "unknown";
  },
}));

jest.mock("react-native-permissions", () => ({
  RESULTS: {
    UNAVAILABLE: "unavailable",
    DENIED: "denied",
    LIMITED: "limited",
    GRANTED: "granted",
    BLOCKED: "blocked",
  },
  PERMISSIONS: {
    IOS: {
      CAMERA: "ios.permission.CAMERA",
      PHOTO_LIBRARY: "ios.permission.PHOTO_LIBRARY",
      MICROPHONE: "ios.permission.MICROPHONE",
      NOTIFICATIONS: "ios.permission.NOTIFICATIONS",
    },
    ANDROID: {
      CAMERA: "android.permission.CAMERA",
      RECORD_AUDIO: "android.permission.RECORD_AUDIO",
      READ_MEDIA_IMAGES: "android.permission.READ_MEDIA_IMAGES",
      READ_MEDIA_VIDEO: "android.permission.READ_MEDIA_VIDEO",
      READ_EXTERNAL_STORAGE: "android.permission.READ_EXTERNAL_STORAGE",
      POST_NOTIFICATIONS: "android.permission.POST_NOTIFICATIONS",
    },
  },
  check: (...args: unknown[]) => mockCheck(...args),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios", Version: 17 },
}));

// Import after mocks are set up
import { checkPermission as checkNative } from "./check-permission.native";
import { checkPermission as checkWeb } from "./check-permission.web";

describe("checkPermission native iOS", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("checks camera and returns mapped status", async () => {
    mockCheck.mockResolvedValue("granted");
    const result = await checkNative(PermissionType.Camera);
    expect(result.type).toBe(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
  });

  it("returns NotAvailable for Cloud on iOS", async () => {
    const result = await checkNative(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.NotAvailable);
  });
});

describe("checkPermission native Android", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const platform = jest.requireMock("react-native").Platform;
    platform.OS = "android";
    platform.Version = 33;
  });

  afterEach(() => {
    const platform = jest.requireMock("react-native").Platform;
    platform.OS = "ios";
    platform.Version = 17;
  });

  it("returns Granted for Cloud", async () => {
    const result = await checkNative(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.Granted);
  });
});

describe("checkPermission web photos", () => {
  it("returns Granted for Photos without querying", async () => {
    const result = await checkWeb(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.Granted);
  });

  it("returns NotAvailable for Cloud", async () => {
    const result = await checkWeb(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.NotAvailable);
  });
});

describe("checkPermission web camera", () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, "navigator", {
      value: originalNavigator,
      configurable: true,
    });
  });

  it("queries navigator.permissions for camera", async () => {
    const mockQuery = jest.fn().mockResolvedValue({ state: "granted" });
    Object.defineProperty(global, "navigator", {
      value: { permissions: { query: mockQuery } },
      configurable: true,
    });
    const result = await checkWeb(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(mockQuery).toHaveBeenCalledWith({ name: "camera" });
  });

  it("returns NotAvailable when permissions API is missing", async () => {
    Object.defineProperty(global, "navigator", {
      value: {},
      configurable: true,
    });
    const result = await checkWeb(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.NotAvailable);
  });
});
