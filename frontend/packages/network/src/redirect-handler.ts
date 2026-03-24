import { NetworkError } from './network-error';

interface RedirectOptions {
  maxRedirects: number;
  originalUrl: string;
}

const SENSITIVE_HEADERS = ['authorization', 'cookie', 'proxy-authorization'];

const PRIVATE_IP_PATTERNS = [
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
  /^169\.254\.\d{1,3}\.\d{1,3}$/,
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
];

export async function followRedirects(
  options: RedirectOptions,
  fetchFn: typeof fetch,
  request: Request,
): Promise<Response> {
  let currentRequest = request;
  for (let count = 0; count < options.maxRedirects; count++) {
    const response = await fetchFn(currentRequest);
    if (!isRedirect(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;
    const targetUrl = new URL(location, currentRequest.url);
    validateRedirectTarget(targetUrl, options.originalUrl);
    const headers = buildRedirectHeaders(currentRequest, targetUrl);
    currentRequest = new Request(targetUrl.href, {
      method: getRedirectMethod(response.status, currentRequest.method),
      headers,
      redirect: 'manual',
    });
  }
  throw new NetworkError({ code: 'REDIRECT_LOOP', message: 'Max redirects exceeded' });
}

function isRedirect(status: number): boolean {
  return status >= 300 && status < 400 && status !== 304;
}

function validateRedirectTarget(
  target: URL,
  originalUrl: string,
): void {
  if (target.protocol !== 'https:' && target.protocol !== 'http:') {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `Redirect to non-HTTP(S) scheme: ${target.protocol}`,
    });
  }
  const originalHostname = new URL(originalUrl).hostname;
  const isOriginalPrivate = isPrivateHost(originalHostname);
  if (!isOriginalPrivate && isPrivateHost(target.hostname)) {
    throw new NetworkError({
      code: 'CLIENT_ERROR',
      message: `SSRF: redirect to private IP ${target.hostname} blocked`,
    });
  }
}

function isPrivateHost(hostname: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(hostname));
}

function buildRedirectHeaders(
  request: Request,
  target: URL,
): Headers {
  const headers = new Headers(request.headers);
  const originalOrigin = new URL(request.url).origin;
  if (originalOrigin !== target.origin) {
    for (const header of SENSITIVE_HEADERS) {
      headers.delete(header);
    }
  }
  return headers;
}

function getRedirectMethod(
  status: number,
  originalMethod: string,
): string {
  if (status === 303) return 'GET';
  if (status === 301 || status === 302) {
    return originalMethod === 'POST' ? 'GET' : originalMethod;
  }
  return originalMethod;
}
