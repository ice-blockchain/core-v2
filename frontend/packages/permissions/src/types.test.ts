import { PermissionType, PermissionStatus } from "./types";

describe("PermissionType", () => {
  it("defines all five permission types", () => {
    expect(PermissionType.Camera).toBe("camera");
    expect(PermissionType.Photos).toBe("photos");
    expect(PermissionType.Microphone).toBe("microphone");
    expect(PermissionType.Notifications).toBe("notifications");
    expect(PermissionType.Cloud).toBe("cloud");
  });

  it("has exactly 5 members", () => {
    const values = Object.values(PermissionType);
    expect(values).toHaveLength(5);
  });
});

describe("PermissionStatus", () => {
  it("defines all eight status values", () => {
    expect(PermissionStatus.Granted).toBe("granted");
    expect(PermissionStatus.Denied).toBe("denied");
    expect(PermissionStatus.Limited).toBe("limited");
    expect(PermissionStatus.PermanentlyDenied).toBe("blocked");
    expect(PermissionStatus.Restricted).toBe("restricted");
    expect(PermissionStatus.Provisional).toBe("provisional");
    expect(PermissionStatus.Unknown).toBe("unknown");
    expect(PermissionStatus.NotAvailable).toBe("not_available");
  });

  it("has exactly 8 members", () => {
    const values = Object.values(PermissionStatus);
    expect(values).toHaveLength(8);
  });
});
