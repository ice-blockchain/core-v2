import { PermissionType, PermissionStatus } from "./types";
import * as store from "./permission-store";
import { refreshPermissions } from "./refresh-permissions";

beforeEach(() => { store.clear(); });

describe("refreshPermissions updates store", () => {
  it("checks all provided types and updates store", async () => {
    const mockCheck = jest.fn()
      .mockResolvedValueOnce({
        type: PermissionType.Camera,
        status: PermissionStatus.Granted,
      })
      .mockResolvedValueOnce({
        type: PermissionType.Microphone,
        status: PermissionStatus.Denied,
      });

    await refreshPermissions(
      [PermissionType.Camera, PermissionType.Microphone],
      mockCheck,
    );

    expect(store.getStatus(PermissionType.Camera)).toBe(
      PermissionStatus.Granted,
    );
    expect(store.getStatus(PermissionType.Microphone)).toBe(
      PermissionStatus.Denied,
    );
  });

  it("handles empty types array", async () => {
    const mockCheck = jest.fn();
    await refreshPermissions([], mockCheck);
    expect(mockCheck).not.toHaveBeenCalled();
  });
});

describe("refreshPermissions notifications", () => {
  it("notifies subscribers for changed permissions only", async () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });

    const listener = jest.fn();
    store.subscribe(listener);

    const mockCheck = jest.fn()
      .mockResolvedValueOnce({
        type: PermissionType.Camera,
        status: PermissionStatus.Granted,
      })
      .mockResolvedValueOnce({
        type: PermissionType.Microphone,
        status: PermissionStatus.Denied,
      });

    await refreshPermissions(
      [PermissionType.Camera, PermissionType.Microphone],
      mockCheck,
    );

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      type: PermissionType.Microphone,
      status: PermissionStatus.Denied,
    });
  });
});
