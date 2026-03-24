let resizeListeners: Array<() => void> = [];
let mockViewportHeight = 800;

beforeEach(() => {
  jest.resetModules();
  resizeListeners = [];
  mockViewportHeight = 800;

  Object.defineProperty(window, "innerHeight", {
    get: () => 800,
    configurable: true,
  });

  Object.defineProperty(window, "visualViewport", {
    value: {
      get height() {
        return mockViewportHeight;
      },
      addEventListener: (_event: string, handler: unknown) => {
        resizeListeners.push(handler as () => void);
      },
      removeEventListener: (_event: string, handler: unknown) => {
        resizeListeners = resizeListeners.filter((l) => l !== handler);
      },
    },
    writable: true,
    configurable: true,
  });
});

describe("keyboard web initial state", () => {
  it("reports keyboard as not visible initially", async () => {
    const mod = await import("./keyboard.web");
    expect(mod.isKeyboardVisible()).toBe(false);
    expect(mod.getKeyboardHeight()).toBe(0);
  });
});

describe("keyboard web detects open", () => {
  it("detects keyboard open via viewport resize", async () => {
    const { onKeyboardChange } = await import("./keyboard.web");
    const callback = jest.fn();
    onKeyboardChange(callback);

    mockViewportHeight = 500;
    resizeListeners[0]?.();

    expect(callback).toHaveBeenCalledWith({ isVisible: true, height: 300 });
  });
});

describe("keyboard web detects close", () => {
  it("detects keyboard close when viewport restores", async () => {
    const { onKeyboardChange } = await import("./keyboard.web");
    const callback = jest.fn();
    onKeyboardChange(callback);

    mockViewportHeight = 500;
    resizeListeners[0]?.();

    mockViewportHeight = 800;
    resizeListeners[0]?.();

    expect(callback).toHaveBeenLastCalledWith({ isVisible: false, height: 0 });
  });
});

describe("keyboard web unsubscribe", () => {
  it("unsubscribes on cleanup", async () => {
    const { onKeyboardChange } = await import("./keyboard.web");
    const unsubscribe = onKeyboardChange(jest.fn());
    expect(resizeListeners).toHaveLength(1);

    unsubscribe();
    expect(resizeListeners).toHaveLength(0);
  });
});
