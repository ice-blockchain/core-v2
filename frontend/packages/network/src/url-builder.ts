import { NetworkError } from './network-error';

export function interpolatePathParams(
  path: string,
  params?: Record<string, string>,
): string {
  if (path.startsWith('//')) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `Protocol-relative path not allowed: ${path}`,
    });
  }
  if (!params) return path;
  let result = path;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(`:${key}`, encodeURIComponent(value));
  }
  return result;
}
