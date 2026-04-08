import { describe, it, expect, vi } from "vitest";
import { checkGalleryPermission } from "./check-gallery-permission";

vi.mock("@ion/permissions", () => ({
  Permissions: { check: vi.fn() },
  PermissionType: { Photos: "photos" },
  PermissionStatus: {
    Granted: "granted",
    Limited: "limited",
    PermanentlyDenied: "blocked",
    Denied: "denied",
  },
}));

const { Permissions } = await import("@ion/permissions");
const check = vi.mocked(Permissions.check);

describe("checkGalleryPermission", () => {
  it("returns granted when photos permission is granted", async () => {
    check.mockResolvedValueOnce({ type: "photos" as never, status: "granted" as never });
    expect(await checkGalleryPermission()).toBe("granted");
  });

  it("returns limited when photos permission is limited", async () => {
    check.mockResolvedValueOnce({ type: "photos" as never, status: "limited" as never });
    expect(await checkGalleryPermission()).toBe("limited");
  });

  it("returns permanently_denied when blocked", async () => {
    check.mockResolvedValueOnce({ type: "photos" as never, status: "blocked" as never });
    expect(await checkGalleryPermission()).toBe("permanently_denied");
  });

  it("returns denied for unknown status", async () => {
    check.mockResolvedValueOnce({ type: "photos" as never, status: "unknown" as never });
    expect(await checkGalleryPermission()).toBe("denied");
  });
});
