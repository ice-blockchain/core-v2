import { authEN } from "./translations/en";

const translations: Record<string, string> = {};
for (const [key, value] of Object.entries(authEN)) {
  translations[`auth:${key}`] = value;
}

jest.mock("@ion/localization", () => ({
  translate: (key: string) => translations[key] ?? key,
}));
