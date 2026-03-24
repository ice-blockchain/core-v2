beforeEach(() => {
  jest.resetModules();

  Object.defineProperty(window, "innerWidth", {
    value: 375,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "innerHeight", {
    value: 812,
    writable: true,
    configurable: true,
  });

  Object.defineProperty(window, "devicePixelRatio", {
    value: 3,
    writable: true,
    configurable: true,
  });
});

describe("getScreenDimensions web", () => {
  it("returns screen dimensions from window", async () => {
    const { getScreenDimensions } = await import("./screen-dimensions.web");

    expect(getScreenDimensions()).toEqual({ width: 375, height: 812, scale: 3 });
  });
});

describe("getSafeAreaInsets web", () => {
  it("returns all zeros since CSS env() is not readable from JS", async () => {
    const { getSafeAreaInsets } = await import("./screen-dimensions.web");

    expect(getSafeAreaInsets()).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });
});
