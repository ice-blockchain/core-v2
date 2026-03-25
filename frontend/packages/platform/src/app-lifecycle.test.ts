let listeners: Array<() => void> = [];
let visibilityState = "visible";

beforeEach(() => {
  jest.resetModules();
  listeners = [];

  Object.defineProperty(document, "visibilityState", {
    get: () => visibilityState,
    configurable: true,
  });

  jest.spyOn(document, "addEventListener").mockImplementation(
    (_event: string, handler: unknown) => {
      listeners.push(handler as () => void);
    },
  );

  jest.spyOn(document, "removeEventListener").mockImplementation(
    (_event: string, handler: unknown) => {
      listeners = listeners.filter((l) => l !== handler);
    },
  );
});

describe("getCurrentAppState web", () => {
  it("returns active when document is visible", async () => {
    visibilityState = "visible";
    const { getCurrentAppState } = await import("./app-lifecycle.web");
    expect(getCurrentAppState()).toBe("active");
  });

  it("returns background when document is hidden", async () => {
    visibilityState = "hidden";
    const { getCurrentAppState } = await import("./app-lifecycle.web");
    expect(getCurrentAppState()).toBe("background");
  });
});

describe("onAppStateChange web", () => {
  it("notifies listener on visibility change", async () => {
    visibilityState = "visible";
    const { onAppStateChange } = await import("./app-lifecycle.web");

    const callback = jest.fn();
    onAppStateChange(callback);

    visibilityState = "hidden";
    listeners[0]?.();
    expect(callback).toHaveBeenCalledWith("background");
  });

  it("unsubscribes when cleanup is called", async () => {
    const { onAppStateChange } = await import("./app-lifecycle.web");

    const unsubscribe = onAppStateChange(jest.fn());
    expect(listeners).toHaveLength(1);

    unsubscribe();
    expect(listeners).toHaveLength(0);
  });
});
