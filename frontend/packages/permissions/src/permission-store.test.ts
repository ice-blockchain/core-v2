import { PermissionType, PermissionStatus } from "./types";
import * as store from "./permission-store";

beforeEach(() => { store.clear(); });

describe("PermissionStore getStatus", () => {
  it("returns Unknown for unchecked permissions", () => {
    expect(store.getStatus(PermissionType.Camera)).toBe(
      PermissionStatus.Unknown,
    );
  });

  it("returns updated status after update", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    expect(store.getStatus(PermissionType.Camera)).toBe(
      PermissionStatus.Granted,
    );
  });
});

describe("PermissionStore subscribe notifications", () => {
  it("notifies subscribers on status change", () => {
    const listener = jest.fn();
    store.subscribe(listener);
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    expect(listener).toHaveBeenCalledWith({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
  });

  it("does not notify when status is unchanged", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    const listener = jest.fn();
    store.subscribe(listener);
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("PermissionStore unsubscribe", () => {
  it("unsubscribes correctly", () => {
    const listener = jest.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("PermissionStore getAll", () => {
  it("returns a snapshot of all statuses", () => {
    store.update({
      type: PermissionType.Camera,
      status: PermissionStatus.Granted,
    });
    store.update({
      type: PermissionType.Microphone,
      status: PermissionStatus.Denied,
    });
    const all = store.getAll();
    expect(all.get(PermissionType.Camera)).toBe(PermissionStatus.Granted);
    expect(all.get(PermissionType.Microphone)).toBe(PermissionStatus.Denied);
  });

  it("returns a copy that does not affect internal state", () => {
    const all = store.getAll();
    all.set(PermissionType.Camera, PermissionStatus.Granted);
    expect(store.getStatus(PermissionType.Camera)).toBe(
      PermissionStatus.Unknown,
    );
  });
});
