import { Logger } from '@ion/diagnostics';
import { NetworkError } from './network-error';

interface HttpsValidatorConfig {
  allowlist: readonly string[];
  isProduction: boolean;
}

const PRIVATE_PATTERNS = [
  /^localhost$/,
  /^127\.0\.0\.1$/,
  /^::1$/,
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,
  /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/,
  /^192\.168\.\d{1,3}\.\d{1,3}$/,
];

export function createHttpsValidator(
  config: HttpsValidatorConfig,
): (url: string) => void {
  if (config.isProduction && config.allowlist.length > 0) {
    throw new Error('HTTPS allowlist must be empty in production');
  }
  validateAllowlistEntries(config.allowlist);
  const frozenList = Object.freeze([...config.allowlist]);
  return (url: string) => { enforceHttps(url, frozenList); };
}

function validateAllowlistEntries(
  allowlist: readonly string[],
): void {
  for (const host of allowlist) {
    const isPrivate = PRIVATE_PATTERNS.some((p) => p.test(host));
    if (!isPrivate) {
      throw new Error(
        `HTTPS allowlist only accepts private/local hosts, got: ${host}`,
      );
    }
  }
}

function enforceHttps(
  url: string,
  allowlist: readonly string[],
): void {
  const parsed = new URL(url);
  if (parsed.protocol === 'https:') return;
  if (parsed.protocol !== 'http:') {
    throw new NetworkError({
      code: 'HTTPS_REQUIRED',
      message: `Non-HTTP(S) scheme not allowed: ${parsed.protocol}`,
    });
  }
  if (allowlist.includes(parsed.hostname)) {
    Logger.warning('Non-HTTPS request allowed via allowlist', {
      tag: 'network',
      data: { url, hostname: parsed.hostname },
    });
    return;
  }
  throw new NetworkError({
    code: 'HTTPS_REQUIRED',
    message: `HTTPS required, got HTTP for: ${parsed.hostname}`,
  });
}
