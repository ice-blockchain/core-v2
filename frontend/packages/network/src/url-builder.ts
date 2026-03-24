import { NetworkError } from './network-error';

interface BuildUrlOptions {
  baseUrl: string;
  path: string;
  params?: Record<string, string> | undefined;
  query?: Record<string, string> | undefined;
}

export function buildRequestUrl(options: BuildUrlOptions): string {
  const interpolatedPath = interpolateParams(options.path, options.params);
  const fullUrl = joinBaseAndPath(options.baseUrl, interpolatedPath);
  validateOrigin(options.baseUrl, fullUrl);
  return appendQueryString(fullUrl, options.query);
}

function interpolateParams(
  path: string,
  params?: Record<string, string>,
): string {
  if (!params) return path;
  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value));
  }
  return result;
}

function joinBaseAndPath(baseUrl: string, path: string): string {
  if (path.startsWith('//')) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `Protocol-relative path not allowed: ${path}`,
    });
  }
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const segment = path.startsWith('/') ? path : `/${path}`;
  return `${base}${segment}`;
}

function validateOrigin(baseUrl: string, fullUrl: string): void {
  const baseOrigin = new URL(baseUrl).origin;
  const fullOrigin = new URL(fullUrl).origin;
  if (baseOrigin !== fullOrigin) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `URL origin mismatch: expected ${baseOrigin}, got ${fullOrigin}`,
    });
  }
}

function appendQueryString(
  url: string,
  query?: Record<string, string>,
): string {
  if (!query) return url;
  const entries = Object.entries(query).filter(
    ([, value]) => value !== undefined && value !== null,
  );
  if (entries.length === 0) return url;
  const params = new URLSearchParams(entries);
  return `${url}?${params.toString()}`;
}
