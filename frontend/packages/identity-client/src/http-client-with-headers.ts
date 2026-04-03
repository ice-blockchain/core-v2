import type { HttpClient } from '@ion/network';

export function withDefaultHeaders(
  httpClient: HttpClient,
  defaultHeaders: Record<string, string>,
): HttpClient {
  function mergeHeaders(options?: { headers?: Record<string, string> | undefined }) {
    return { ...defaultHeaders, ...options?.headers };
  }

  return {
    get: (url, options) => httpClient.get(url, { ...options, headers: mergeHeaders(options) }),
    post: (url, options) => httpClient.post(url, { ...options, headers: mergeHeaders(options) }),
    put: (url, options) => httpClient.put(url, { ...options, headers: mergeHeaders(options) }),
    patch: (url, options) => httpClient.patch(url, { ...options, headers: mergeHeaders(options) }),
    delete: (url, options) => httpClient.delete(url, { ...options, headers: mergeHeaders(options) }),
    upload: (url, formData, options) => httpClient.upload(url, formData, { ...options, headers: mergeHeaders(options) }),
    head: (url, options) => httpClient.head(url, { ...options, headers: mergeHeaders(options) }),
  };
}
