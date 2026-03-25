const mockGetAndroidId = jest.fn();
const mockAsyncGetItem = jest.fn().mockResolvedValue(null);
const mockAsyncSetItem = jest.fn().mockResolvedValue(undefined);

jest.mock("react-native-device-info", () => ({
  __esModule: true,
  default: { getAndroidId: () => mockGetAndroidId() },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: (...args: unknown[]) => mockAsyncGetItem(...args),
    setItem: (...args: unknown[]) => mockAsyncSetItem(...args),
  },
}));

jest.mock("./generate-uuid", () => ({
  generateUuid: jest.fn().mockReturnValue("fallback-uuid"),
}));

describe("getAndroidDeviceId returns native ID", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("returns Android ID when available", async () => {
    mockGetAndroidId.mockResolvedValue("abc123");

    const { getAndroidDeviceId } = await import("./device-identity-android");
    const id = await getAndroidDeviceId();

    expect(id).toBe("abc123");
  });
});

describe("getAndroidDeviceId falls back on rejection", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("falls back to UUID when getAndroidId throws", async () => {
    mockGetAndroidId.mockRejectedValue(new Error("OEM restriction"));

    const { getAndroidDeviceId } = await import("./device-identity-android");
    const id = await getAndroidDeviceId();

    expect(id).toBe("fallback-uuid");
    expect(mockAsyncSetItem).toHaveBeenCalled();
  });
});

describe("getAndroidDeviceId falls back on unknown", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("falls back when Android ID is 'unknown'", async () => {
    mockGetAndroidId.mockResolvedValue("unknown");

    const { getAndroidDeviceId } = await import("./device-identity-android");
    const id = await getAndroidDeviceId();

    expect(id).toBe("fallback-uuid");
  });
});
