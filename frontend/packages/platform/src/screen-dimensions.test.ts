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
  it("returns numeric insets for all four sides", async () => {
    const { getSafeAreaInsets } = await import("./screen-dimensions.web");
    const insets = getSafeAreaInsets();

    expect(insets).toEqual({
      top: expect.any(Number),
      bottom: expect.any(Number),
      left: expect.any(Number),
      right: expect.any(Number),
    });
  });
});
