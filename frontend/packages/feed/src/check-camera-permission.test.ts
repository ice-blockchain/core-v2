import { describe, it, expect, vi } from "vitest";
import { checkCameraPermission } from "./check-camera-permission";

vi.mock("@ion/permissions", () => ({
  Permissions: { check: vi.fn() },
  PermissionType: { Camera: "camera" },
  PermissionStatus: {
    Granted: "granted",
    Limited: "limited",
    PermanentlyDenied: "blocked",
    Denied: "denied",
  },
}));

const { Permissions } = await import("@ion/permissions");
const check = vi.mocked(Permissions.check);

describe("checkCameraPermission", () => {
  it("returns granted when camera permission is granted", async () => {
    check.mockResolvedValueOnce({ type: "camera" as never, status: "granted" as never });
    expect(await checkCameraPermission()).toBe("granted");
  });

  it("returns permanently_denied when blocked", async () => {
    check.mockResolvedValueOnce({ type: "camera" as never, status: "blocked" as never });
    expect(await checkCameraPermission()).toBe("permanently_denied");
  });

  it("returns denied for unknown status", async () => {
    check.mockResolvedValueOnce({ type: "camera" as never, status: "unknown" as never });
    expect(await checkCameraPermission()).toBe("denied");
  });
});
