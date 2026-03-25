import { describe, it, expect } from "vitest";
import { assertSafeUri } from "./validate-uri";

describe("assertSafeUri accepts safe URIs", () => {
  it("accepts a normal file URI", () => {
    expect(() => assertSafeUri("file:///tmp/video.mp4")).not.toThrow();
  });

  it("accepts a blob URI", () => {
    expect(() => assertSafeUri("blob://mock/video")).not.toThrow();
  });

  it("accepts a content URI with path segments", () => {
    expect(() =>
      assertSafeUri("content://media/external/images/123"),
    ).not.toThrow();
  });

  it("accepts an https URI", () => {
    expect(() =>
      assertSafeUri("https://example.com/image.png"),
    ).not.toThrow();
  });
});

describe("assertSafeUri rejects unsafe URIs", () => {
  it.each([
    ["double quote", 'file:///tmp/video";rm -rf /'],
    ["semicolon", "file:///tmp/video;echo hack"],
    ["backtick", "file:///tmp/`whoami`"],
    ["pipe", "file:///tmp/video|cat /etc/passwd"],
    ["newline", "file:///tmp/video\necho hack"],
    ["carriage return", "file:///tmp/video\recho hack"],
    ["backslash", "file:///tmp/video\\test"],
    ["space", "file:///tmp/my video.mp4"],
    ["curly brace", "file:///tmp/${HOME}"],
    ["angle bracket", "file:///tmp/<script>"],
  ])("rejects URI containing %s", (_label, uri) => {
    expect(() => assertSafeUri(uri)).toThrow("unsafe characters");
  });

  it("rejects empty string", () => {
    expect(() => assertSafeUri("")).toThrow("unsafe characters");
  });

  it("rejects bare path without scheme", () => {
    expect(() => assertSafeUri("/tmp/video.mp4")).toThrow("unsafe characters");
  });
});
