import { PermissionType, PermissionStatus } from "../types";

const mockRequest = jest.fn();

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
  request: (...args: unknown[]) => mockRequest(...args),
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios", Version: 17 },
}));

import { requestPermission as requestNative } from "./request-permission.native";
import { requestPermission as requestWeb } from "./request-permission.web";

describe("requestPermission native iOS", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it("requests camera permission", async () => {
    mockRequest.mockResolvedValue("granted");
    const result = await requestNative(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(mockRequest).toHaveBeenCalledWith("ios.permission.CAMERA");
  });

  it("returns NotAvailable for Cloud on iOS", async () => {
    const result = await requestNative(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.NotAvailable);
  });
});

function setupAndroid(): void {
  const platform = jest.requireMock("react-native").Platform;
  platform.OS = "android";
  platform.Version = 33;
}

function teardownAndroid(): void {
  const platform = jest.requireMock("react-native").Platform;
  platform.OS = "ios";
  platform.Version = 17;
}

describe("requestPermission native Android cloud", () => {
  beforeEach(() => { jest.clearAllMocks(); setupAndroid(); });
  afterEach(() => { teardownAndroid(); });

  it("returns Granted for Cloud", async () => {
    const result = await requestNative(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.Granted);
  });

  it("requests both media permissions on SDK 33+", async () => {
    mockRequest.mockResolvedValue("granted");
    const result = await requestNative(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});

describe("requestPermission native Android restrictiveness", () => {
  beforeEach(() => { jest.clearAllMocks(); setupAndroid(); });
  afterEach(() => { teardownAndroid(); });

  it("returns Denied when images denied and video granted", async () => {
    mockRequest
      .mockResolvedValueOnce("granted")
      .mockResolvedValueOnce("denied");
    const result = await requestNative(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.Denied);
  });

  it("returns PermanentlyDenied when one perm is blocked", async () => {
    mockRequest
      .mockResolvedValueOnce("denied")
      .mockResolvedValueOnce("blocked");
    const result = await requestNative(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.PermanentlyDenied);
  });
});

describe("requestPermission web photos and cloud", () => {
  it("returns Granted for Photos", async () => {
    const result = await requestWeb(PermissionType.Photos);
    expect(result.status).toBe(PermissionStatus.Granted);
  });

  it("returns NotAvailable for Cloud", async () => {
    const result = await requestWeb(PermissionType.Cloud);
    expect(result.status).toBe(PermissionStatus.NotAvailable);
  });
});

function setNavigator(value: unknown): void {
  Object.defineProperty(global, "navigator", {
    value,
    configurable: true,
  });
}

describe("requestPermission web camera stream", () => {
  const originalNavigator = global.navigator;
  afterEach(() => { setNavigator(originalNavigator); });

  it("triggers getUserMedia and releases stream", async () => {
    const stopFn = jest.fn();
    const mockStream = { getTracks: () => [{ stop: stopFn }] };
    setNavigator({ mediaDevices: { getUserMedia: jest.fn().mockResolvedValue(mockStream) } });
    const result = await requestWeb(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(stopFn).toHaveBeenCalled();
  });

  it("releases all tracks even if one stop() throws", async () => {
    const stopA = jest.fn(() => { throw new Error("stop failed"); });
    const stopB = jest.fn();
    const mockStream = { getTracks: () => [{ stop: stopA }, { stop: stopB }] };
    setNavigator({ mediaDevices: { getUserMedia: jest.fn().mockResolvedValue(mockStream) } });
    const result = await requestWeb(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.Granted);
    expect(stopA).toHaveBeenCalled();
    expect(stopB).toHaveBeenCalled();
  });
});

describe("requestPermission web camera denied", () => {
  const originalNavigator = global.navigator;
  afterEach(() => { setNavigator(originalNavigator); });

  it("returns PermanentlyDenied on NotAllowedError", async () => {
    const error = new DOMException("denied", "NotAllowedError");
    setNavigator({ mediaDevices: { getUserMedia: jest.fn().mockRejectedValue(error) } });
    const result = await requestWeb(PermissionType.Camera);
    expect(result.status).toBe(PermissionStatus.PermanentlyDenied);
  });
});

describe("requestPermission web notifications", () => {
  it("calls Notification.requestPermission", async () => {
    const mockReqPerm = jest.fn().mockResolvedValue("granted");
    // @ts-expect-error -- mocking global Notification
    global.Notification = { requestPermission: mockReqPerm };

    const result = await requestWeb(PermissionType.Notifications);
    expect(result.status).toBe(PermissionStatus.Granted);

    // @ts-expect-error -- cleanup
    delete global.Notification;
  });
});
