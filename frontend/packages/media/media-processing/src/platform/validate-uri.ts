const SAFE_URI_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=%-]+$/;

export function assertSafeUri(uri: string): void {
  if (!uri || !SAFE_URI_PATTERN.test(uri)) {
    throw new Error("URI contains unsafe characters");
  }
}
