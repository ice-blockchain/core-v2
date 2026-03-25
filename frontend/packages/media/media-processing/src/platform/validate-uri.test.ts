import { describe, it, expect } from "vitest";
import { assertSafeUri } from "./validate-uri";

describe("assertSafeUri accepts safe URIs", () => {
  it("accepts a normal file URI", () => {
    expect(() => assertSafeUri("file:///tmp/video.mp4")).not.toThrow();
  });

  it("accepts a blob URI", () => {
    expect(() => assertSafeUri("blob:mock/video")).not.toThrow();
  });
});

describe("assertSafeUri rejects unsafe URIs", () => {
  it.each([
    ['"', 'file:///tmp/video";rm -rf /'],
    [";", "file:///tmp/video;echo hack"],
    ["$", "file:///tmp/$HOME"],
    ["`", "file:///tmp/`whoami`"],
    ["|", "file:///tmp/video|cat /etc/passwd"],
    ["&", "file:///tmp/video&echo hack"],
    ["\\n", "file:///tmp/video\necho hack"],
    ["\\", "file:///tmp/video\\test"],
  ])("rejects URI containing %s", (_char, uri) => {
    expect(() => assertSafeUri(uri)).toThrow("unsafe characters");
  });
});
