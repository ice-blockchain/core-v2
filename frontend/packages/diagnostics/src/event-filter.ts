import type { LogEntry } from './types';
import { LogLevel } from './types';

const TRANSIENT_NETWORK_PATTERNS: ReadonlyArray<RegExp> = [
  /network request failed/i,
  /timeout exceeded/i,
  /ECONNREFUSED/,
  /ENOTFOUND/,
  /ETIMEDOUT/,
  /ENETUNREACH/,
  /socket hang up/i,
  /ECONNRESET/,
  /EPIPE/,
  /aborted/i,
];

function isTransientNetworkError(message: string): boolean {
  return TRANSIENT_NETWORK_PATTERNS.some((pattern) =>
    pattern.test(message),
  );
}

function buildErrorMessage(entry: LogEntry): string {
  const parts: string[] = [entry.message];

  if (entry.error?.message) {
    parts.push(entry.error.message);
  }

  return parts.join(' ');
}

function shouldSendToSentry(entry: LogEntry): boolean {
  if (entry.level === LogLevel.Fatal) return true;
  if (entry.tag === 'manual_log') return true;

  const fullMessage = buildErrorMessage(entry);
  return !isTransientNetworkError(fullMessage);
}

export { shouldSendToSentry, isTransientNetworkError };
