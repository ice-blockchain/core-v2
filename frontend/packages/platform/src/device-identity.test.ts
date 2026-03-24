import { generateUuid } from "./generate-uuid";

jest.mock("./generate-uuid", () => ({
  generateUuid: jest.fn().mockReturnValue("mock-uuid-1234"),
}));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.resetModules();
  Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);

  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: jest.fn((key: string) => mockStorage[key] ?? null),
      setItem: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
    },
    writable: true,
  });
});

describe("getDeviceId web generates new ID", () => {
  it("generates and persists when none exists", async () => {
    const { getDeviceId } = await import("./device-identity.web");
    const id = await getDeviceId();

    expect(id).toBe("mock-uuid-1234");
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "@ion/platform/device-id",
      "mock-uuid-1234",
    );
  });
});

describe("getDeviceId web returns stored ID", () => {
  it("returns stored ID when one exists", async () => {
    mockStorage["@ion/platform/device-id"] = "existing-id";

    const { getDeviceId } = await import("./device-identity.web");
    const id = await getDeviceId();

    expect(id).toBe("existing-id");
    expect(generateUuid).not.toHaveBeenCalled();
  });
});

describe("getDeviceId web caching", () => {
  it("caches the ID in memory after first call", async () => {
    const { getDeviceId } = await import("./device-identity.web");

    await getDeviceId();
    await getDeviceId();

    expect(localStorage.getItem).toHaveBeenCalledTimes(1);
  });
});

describe("getDeviceId web concurrent calls", () => {
  it("returns same ID for all concurrent callers", async () => {
    const { getDeviceId } = await import("./device-identity.web");

    const results = await Promise.all(
      Array.from({ length: 10 }, () => getDeviceId()),
    );

    const unique = new Set(results);
    expect(unique.size).toBe(1);
  });
});
