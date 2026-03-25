import { PermissionStatus } from "../types";
import { mapNativeStatus as mapNative } from "./map-native-status.native";
import { mapNativeStatus as mapWeb } from "./map-native-status.web";

jest.mock("react-native-permissions", () => ({
  RESULTS: {
    UNAVAILABLE: "unavailable",
    DENIED: "denied",
    LIMITED: "limited",
    GRANTED: "granted",
    BLOCKED: "blocked",
  },
}));

describe("mapNativeStatus native", () => {
  it("maps granted to Granted", () => {
    expect(mapNative("granted")).toBe(PermissionStatus.Granted);
  });

  it("maps denied to Denied", () => {
    expect(mapNative("denied")).toBe(PermissionStatus.Denied);
  });

  it("maps blocked to PermanentlyDenied", () => {
    expect(mapNative("blocked")).toBe(PermissionStatus.PermanentlyDenied);
  });

  it("maps limited to Limited", () => {
    expect(mapNative("limited")).toBe(PermissionStatus.Limited);
  });

  it("maps unavailable to NotAvailable", () => {
    expect(mapNative("unavailable")).toBe(PermissionStatus.NotAvailable);
  });

  it("returns Unknown for unrecognized values", () => {
    expect(mapNative("something_else")).toBe(PermissionStatus.Unknown);
  });
});

describe("mapNativeStatus web", () => {
  it("maps granted to Granted", () => {
    expect(mapWeb("granted")).toBe(PermissionStatus.Granted);
  });

  it("maps denied to PermanentlyDenied", () => {
    expect(mapWeb("denied")).toBe(PermissionStatus.PermanentlyDenied);
  });

  it("maps prompt to Denied", () => {
    expect(mapWeb("prompt")).toBe(PermissionStatus.Denied);
  });

  it("maps default to Denied (Notification API)", () => {
    expect(mapWeb("default")).toBe(PermissionStatus.Denied);
  });

  it("returns Unknown for unrecognized values", () => {
    expect(mapWeb("unknown_state")).toBe(PermissionStatus.Unknown);
  });
});
