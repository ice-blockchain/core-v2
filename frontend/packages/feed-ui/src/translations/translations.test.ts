import { describe, it, expect } from "vitest";
import { feedEN } from "./en";
import { feedFR } from "./fr";
import { feedDE } from "./de";
import { feedTranslations, FEED_NAMESPACE } from "./index";

describe("feed translations", () => {
  it("covers all English keys in French", () => {
    expect(Object.keys(feedFR)).toEqual(Object.keys(feedEN));
  });

  it("covers all English keys in German", () => {
    expect(Object.keys(feedDE)).toEqual(Object.keys(feedEN));
  });

  it("has no empty translation values", () => {
    for (const translations of [feedEN, feedFR, feedDE]) {
      for (const value of Object.values(translations)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("exports resources for all supported locales", () => {
    expect(feedTranslations).toHaveLength(3);
    const locales = feedTranslations.map((r) => r.locale);
    expect(locales).toContain("en");
    expect(locales).toContain("fr");
    expect(locales).toContain("de");
  });

  it("uses the feed namespace", () => {
    expect(FEED_NAMESPACE).toBe("feed");
    for (const resource of feedTranslations) {
      expect(resource.namespace).toBe("feed");
    }
  });
});
