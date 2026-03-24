import { generateUuid } from "./generate-uuid";

describe("generateUuid", () => {
  it("returns a valid UUID v4 format string", () => {
    const uuid = generateUuid();
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(uuid).toMatch(uuidPattern);
  });

  it("generates unique values on each call", () => {
    const first = generateUuid();
    const second = generateUuid();
    expect(first).not.toBe(second);
  });

  it("returns a 36-character string", () => {
    const uuid = generateUuid();
    expect(uuid).toHaveLength(36);
  });
});
