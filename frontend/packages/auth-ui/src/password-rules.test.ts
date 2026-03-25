import { buildPasswordRules, areAllPasswordRulesMet } from "./password-rules";

describe("buildPasswordRules", () => {
  it("marks all rules as not met for empty password", () => {
    const rules = buildPasswordRules("");
    expect(rules.every((r) => !r.isMet)).toBe(true);
  });

  it("marks length rule as met for passwords over 8 characters", () => {
    const rules = buildPasswordRules("abcdefghi");
    const lengthRule = rules.find((r) => r.label.includes("8 characters"));
    expect(lengthRule?.isMet).toBe(true);
  });

  it("marks number rule as met when password contains a digit", () => {
    const rules = buildPasswordRules("abc1");
    const numberRule = rules.find((r) => r.label.includes("1 number"));
    expect(numberRule?.isMet).toBe(true);
  });

  it("marks case rule as met for mixed case", () => {
    const rules = buildPasswordRules("aB");
    const caseRule = rules.find((r) => r.label.includes("Uppercase"));
    expect(caseRule?.isMet).toBe(true);
  });

  it("marks special character rule as met", () => {
    const rules = buildPasswordRules("a!");
    const specialRule = rules.find((r) => r.label.includes("special"));
    expect(specialRule?.isMet).toBe(true);
  });
});

describe("areAllPasswordRulesMet", () => {
  it("returns false for weak password", () => {
    expect(areAllPasswordRulesMet("abc")).toBe(false);
  });

  it("returns true for strong password", () => {
    expect(areAllPasswordRulesMet("Abcdefgh1!")).toBe(true);
  });
});
