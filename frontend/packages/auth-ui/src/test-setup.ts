import { authEN } from "./translations/en";

const translations: Record<string, string> = {};
for (const [key, value] of Object.entries(authEN)) {
  translations[`auth:${key}`] = value;
}

jest.mock("@ion/localization", () => ({
  ...jest.requireActual("@ion/localization"),
  translate: (
    key: string,
    _options?: Record<string, unknown>,
  ) => translations[key] ?? key,
}));

jest.mock("@ion/navigation", () => ({
  useAuthNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), reset: jest.fn() }),
  Routes: {
    Splash: "Splash", GetStarted: "GetStarted", Catalog: "Catalog",
    Sheet: { Auth: "Sheet/Auth" },
    Auth: {
      GetStarted: "GetStarted", Register: "Register",
      ProfileSetup: "ProfileSetup", SelectLanguages: "SelectLanguages",
      DiscoverCreators: "DiscoverCreators", Notifications: "Notifications",
    },
  },
}));
