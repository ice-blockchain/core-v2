jest.mock("./device-info", () => ({
  getDeviceInfo: jest.fn().mockResolvedValue({
    platform: "ios",
    osVersion: "17.2",
    deviceModel: "iPhone14,2",
    appVersion: "1.2.0",
    buildNumber: "42",
  }),
}));

describe("getUserAgent", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it("formats user agent from device info", async () => {
    const { getUserAgent } = await import("./user-agent");
    const userAgent = await getUserAgent();
    expect(userAgent).toBe("ios/17.2 ion/1.2.0.42");
  });

  it("caches result after first call", async () => {
    const { getDeviceInfo } = await import("./device-info");
    const { getUserAgent } = await import("./user-agent");

    await getUserAgent();
    await getUserAgent();

    expect(getDeviceInfo).toHaveBeenCalledTimes(1);
  });
});
