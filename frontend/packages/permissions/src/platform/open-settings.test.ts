import { openSettings as openNative } from "./open-settings.native";
import { openSettings as openWeb } from "./open-settings.web";

const mockOpenSettings = jest.fn().mockResolvedValue(undefined);

jest.mock("react-native-permissions", () => ({
  openSettings: () => mockOpenSettings(),
}));

describe("openSettings native", () => {
  it("calls react-native-permissions openSettings", async () => {
    await openNative();
    expect(mockOpenSettings).toHaveBeenCalled();
  });
});

describe("openSettings web", () => {
  it("resolves without error (no-op)", async () => {
    await expect(openWeb()).resolves.toBeUndefined();
  });
});
