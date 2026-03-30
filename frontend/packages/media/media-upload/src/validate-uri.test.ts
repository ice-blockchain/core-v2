import { describe, it, expect } from "vitest";
import { validateWebUri, validateNativeUri } from "./validate-uri";

describe("validateWebUri", () => {
  it("accepts blob: URIs", () => {
    expect(() => validateWebUri("blob:https://example.com/abc")).not.toThrow();
  });

  it("rejects https: URIs to prevent SSRF", () => {
    expect(() => validateWebUri("https://example.com/photo.jpg")).toThrow("Unsupported URI scheme");
  });

  it("rejects data: URIs to prevent memory exhaustion", () => {
    expect(() => validateWebUri("data:image/png;base64,abc")).toThrow("Unsupported URI scheme");
  });

  it("rejects http: URIs to prevent SSRF and mixed-content", () => {
    expect(() => validateWebUri("http://example.com/photo.jpg")).toThrow("Unsupported URI scheme");
  });

  it("rejects file: URIs to prevent SSRF", () => {
    expect(() => validateWebUri("file:///etc/passwd")).toThrow("Unsupported URI scheme");
  });

  it("rejects javascript: URIs", () => {
    expect(() => validateWebUri("javascript:alert(1)")).toThrow("Unsupported URI scheme");
  });

  it("rejects URIs with no scheme", () => {
    expect(() => validateWebUri("no-scheme")).toThrow("Invalid URI: no scheme");
  });
});

describe("validateNativeUri", () => {
  it("accepts file: URIs", () => {
    expect(() => validateNativeUri("file:///data/photo.jpg")).not.toThrow();
  });

  it("accepts content: URIs", () => {
    expect(() => validateNativeUri("content://media/photo")).not.toThrow();
  });

  it("rejects http: URIs on native", () => {
    expect(() => validateNativeUri("http://evil.com/ssrf")).toThrow("Unsupported URI scheme");
  });

  it("rejects javascript: URIs", () => {
    expect(() => validateNativeUri("javascript:alert(1)")).toThrow("Unsupported URI scheme");
  });

  it("rejects file: URIs with path traversal", () => {
    expect(() => validateNativeUri("file:///data/../etc/passwd")).toThrow("Path traversal");
  });

  it("rejects file: URIs with encoded path traversal", () => {
    expect(() => validateNativeUri("file:///data/%2e%2e/etc/passwd")).toThrow("Path traversal");
  });

  it("accepts file: URIs without traversal", () => {
    expect(() => validateNativeUri("file:///data/user/0/com.app/cache/photo.jpg")).not.toThrow();
  });
});
