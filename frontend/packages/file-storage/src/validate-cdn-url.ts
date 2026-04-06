const ALLOWED_SCHEMES = ['https:', 'http:'];

export function validateCdnUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid CDN URL: ${url}`);
  }
  if (!ALLOWED_SCHEMES.includes(parsed.protocol)) {
    throw new Error(`Disallowed URL scheme: ${parsed.protocol}`);
  }
}
