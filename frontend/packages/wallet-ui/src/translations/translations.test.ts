import { describe, it, expect } from "vitest";
import { walletUiEN } from "./en";
import { walletUiFR } from "./fr";
import { walletUiDE } from "./de";
import { walletUiTranslations, WALLET_UI_NAMESPACE } from "./index";

describe("wallet-ui translations", () => {
  it("covers all English keys in French", () => {
    expect(Object.keys(walletUiFR)).toEqual(Object.keys(walletUiEN));
  });

  it("covers all English keys in German", () => {
    expect(Object.keys(walletUiDE)).toEqual(Object.keys(walletUiEN));
  });

  it("has no empty translation values", () => {
    for (const translations of [walletUiEN, walletUiFR, walletUiDE]) {
      for (const value of Object.values(translations)) {
        expect(value.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("exports resources for all supported locales", () => {
    expect(walletUiTranslations).toHaveLength(3);
    const locales = walletUiTranslations.map((r) => r.locale);
    expect(locales).toContain("en");
    expect(locales).toContain("fr");
    expect(locales).toContain("de");
  });

  it("uses the walletUi namespace", () => {
    expect(WALLET_UI_NAMESPACE).toBe("walletUi");
    for (const resource of walletUiTranslations) {
      expect(resource.namespace).toBe("walletUi");
    }
  });
});
