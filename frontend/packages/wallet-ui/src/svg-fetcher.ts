import { createHttpClient, type HttpClient } from "@ion/network";

let httpClient: HttpClient | null = null;

function getHttpClient(): HttpClient {
  if (!httpClient) {
    httpClient = createHttpClient({ baseUrl: "", isProduction: true });
  }
  return httpClient;
}

export async function fetchSvgText(url: string): Promise<string> {
  const response = await getHttpClient().get<string>(url, { retryable: false });
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`);
  }
  if (typeof response.body !== "string") {
    throw new Error("Unexpected SVG response body");
  }
  return response.body;
}
