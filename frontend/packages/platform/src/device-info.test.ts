const mockGetSystemVersion = jest.fn().mockResolvedValue("17.2");
const mockGetModel = jest.fn().mockResolvedValue("iPhone14,2");
const mockGetVersion = jest.fn().mockResolvedValue("1.2.0");
const mockGetBuildNumber = jest.fn().mockResolvedValue("42");

jest.mock("react-native-device-info", () => ({
  __esModule: true,
  default: {
    getSystemVersion: () => mockGetSystemVersion(),
    getModel: () => mockGetModel(),
    getVersion: () => mockGetVersion(),
    getBuildNumber: () => mockGetBuildNumber(),
  },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

describe("getDeviceInfo returns device info from native", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("returns correct platform and device data", async () => {
    const { getDeviceInfo } = await import("./device-info");
    const info = await getDeviceInfo();

    expect(info).toEqual({
      platform: "ios",
      osVersion: "17.2",
      deviceModel: "iPhone14,2",
      appVersion: "1.2.0",
      buildNumber: "42",
    });
  });
});

describe("getDeviceInfo caches results", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetSystemVersion.mockClear();
  });

  it("only calls native module once across multiple calls", async () => {
    const { getDeviceInfo } = await import("./device-info");

    await getDeviceInfo();
    await getDeviceInfo();

    expect(mockGetSystemVersion).toHaveBeenCalledTimes(1);
  });
});

describe("getDeviceInfo concurrent dedup", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGetSystemVersion.mockClear();
  });

  it("fetches only once for concurrent callers", async () => {
    const { getDeviceInfo } = await import("./device-info");

    const results = await Promise.all(
      Array.from({ length: 10 }, () => getDeviceInfo()),
    );

    expect(mockGetSystemVersion).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r === results[0])).toBe(true);
  });
});
