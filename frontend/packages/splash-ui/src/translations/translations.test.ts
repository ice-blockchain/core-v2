import { describe, it, expect } from "vitest";
import { splashEN } from "./en";
import { splashFR } from "./fr";
import { splashDE } from "./de";
import { splashTranslations, SPLASH_NAMESPACE } from "./index";

describe("splash translations", () => {
  it("covers all English keys in French", () => {
    const enKeys = Object.keys(splashEN);
    const frKeys = Object.keys(splashFR);
    expect(frKeys).toEqual(enKeys);
  });

  it("covers all English keys in German", () => {
    const enKeys = Object.keys(splashEN);
    const deKeys = Object.keys(splashDE);
    expect(deKeys).toEqual(enKeys);
  });

  it("has no empty translation values", () => {
    const allTranslations = [splashEN, splashFR, splashDE];
    for (const translations of allTranslations) {
      for (const value of Object.values(translations)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("exports resources for all supported locales", () => {
    expect(splashTranslations).toHaveLength(3);
    const locales = splashTranslations.map((r) => r.locale);
    expect(locales).toContain("en");
    expect(locales).toContain("fr");
    expect(locales).toContain("de");
  });

  it("uses the splash namespace", () => {
    expect(SPLASH_NAMESPACE).toBe("splash");
    for (const resource of splashTranslations) {
      expect(resource.namespace).toBe("splash");
    }
  });
});
