const ALLOWED_SCHEMES_WEB = new Set(["blob:", "data:"]);
const ALLOWED_SCHEMES_NATIVE = new Set(["file:", "content:"]);

export function validateWebUri(uri: string): void {
  const scheme = getScheme(uri);
  if (!ALLOWED_SCHEMES_WEB.has(scheme)) {
    throw new Error(`Unsupported URI scheme: ${scheme}`);
  }
}

export function validateNativeUri(uri: string): void {
  const scheme = getScheme(uri);
  if (!ALLOWED_SCHEMES_NATIVE.has(scheme)) {
    throw new Error(`Unsupported URI scheme: ${scheme}`);
  }
}

function getScheme(uri: string): string {
  const index = uri.indexOf(":");
  if (index === -1) throw new Error("Invalid URI: no scheme");
  return uri.slice(0, index + 1).toLowerCase();
}
