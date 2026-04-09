import { describe, it, expect, vi } from "vitest";
import { requestGalleryPermission } from "./request-gallery-permission";

vi.mock("@ion/permissions", () => ({
  Permissions: { request: vi.fn() },
  PermissionType: { Photos: "photos" },
  PermissionStatus: {
    Granted: "granted",
    Limited: "limited",
    PermanentlyDenied: "blocked",
    Denied: "denied",
  },
}));

const { Permissions } = await import("@ion/permissions");
const request = vi.mocked(Permissions.request);

describe("requestGalleryPermission", () => {
  it("returns granted when request succeeds", async () => {
    request.mockResolvedValueOnce({ type: "photos" as never, status: "granted" as never });
    expect(await requestGalleryPermission()).toBe("granted");
  });

  it("returns permanently_denied when blocked", async () => {
    request.mockResolvedValueOnce({ type: "photos" as never, status: "blocked" as never });
    expect(await requestGalleryPermission()).toBe("permanently_denied");
  });

  it("returns limited when request yields limited access", async () => {
    request.mockResolvedValueOnce({ type: "photos" as never, status: "limited" as never });
    expect(await requestGalleryPermission()).toBe("limited");
  });

  it("returns denied when request is denied", async () => {
    request.mockResolvedValueOnce({ type: "photos" as never, status: "denied" as never });
    expect(await requestGalleryPermission()).toBe("denied");
  });
});
