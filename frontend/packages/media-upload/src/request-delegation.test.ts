import { describe, it, expect, vi } from "vitest";
import type { HttpClient } from "@ion/network";
import { requestDelegation } from "./request-delegation";

function createMockHttpClient(response: unknown): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn().mockResolvedValue(response),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };
}

describe("request-delegation", () => {
  it("posts to the delegation endpoint and returns response", async () => {
    const mockResponse = {
      bucketName: "media-bucket",
      objectName: "obj-abc123",
      authType: "EDDSA" as const,
      domain: "sp.greenfield.io",
      seedString: "seed-xyz",
      address: "0x1234abcd",
    };

    const httpClient = createMockHttpClient(mockResponse);

    const result = await requestDelegation(
      httpClient,
      "https://api.ion.app",
      { mimeType: "image/jpeg", fileSize: 4096 },
    );

    expect(httpClient.post).toHaveBeenCalledWith(
      "https://api.ion.app/uploads/delegate",
      { body: { mimeType: "image/jpeg", fileSize: 4096 } },
    );
    expect(result.bucketName).toBe("media-bucket");
    expect(result.objectName).toBe("obj-abc123");
    expect(result.authType).toBe("EDDSA");
  });

  it("propagates network errors from httpClient", async () => {
    const httpClient = createMockHttpClient(null);
    vi.mocked(httpClient.post).mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    await expect(
      requestDelegation(httpClient, "https://api.ion.app", {
        mimeType: "image/png",
        fileSize: 1024,
      }),
    ).rejects.toThrow("Connection refused");
  });
});
