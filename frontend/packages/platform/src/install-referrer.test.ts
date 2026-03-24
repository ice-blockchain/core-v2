beforeEach(() => {
  jest.resetModules();
});

function mockLocationSearch(search: string): void {
  Object.defineProperty(window, "location", {
    value: { search },
    writable: true,
    configurable: true,
  });
}

describe("install-referrer web parses params", () => {
  it("parses ref param as senderId", async () => {
    mockLocationSearch("?ref=friend123&utm_campaign=launch");

    const { getInstallReferrer } = await import("./install-referrer.web");
    const referrer = await getInstallReferrer();

    expect(referrer.senderId).toBe("friend123");
    expect(referrer.rawReferrer).toContain("ref=friend123");
  });

  it("falls back to utm_source when ref is missing", async () => {
    mockLocationSearch("?utm_source=twitter&utm_medium=social");

    const { getInstallReferrer } = await import("./install-referrer.web");
    const referrer = await getInstallReferrer();

    expect(referrer.senderId).toBe("twitter");
  });
});

describe("install-referrer web empty state", () => {
  it("returns null senderId when no params exist", async () => {
    mockLocationSearch("");

    const { getInstallReferrer } = await import("./install-referrer.web");
    const referrer = await getInstallReferrer();

    expect(referrer.senderId).toBeNull();
    expect(referrer.rawReferrer).toBeNull();
  });
});

describe("install-referrer web caching", () => {
  it("caches result after first call", async () => {
    mockLocationSearch("?ref=abc");

    const { getInstallReferrer } = await import("./install-referrer.web");
    const first = await getInstallReferrer();

    mockLocationSearch("?ref=xyz");
    const second = await getInstallReferrer();

    expect(first.senderId).toBe(second.senderId);
  });
});
