const UNSAFE_URI_PATTERN = /[";$`\\|&\n\r]/;

export function assertSafeUri(uri: string): void {
  if (UNSAFE_URI_PATTERN.test(uri)) {
    throw new Error("URI contains unsafe characters");
  }
}
