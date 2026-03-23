import type { LogEntry, SentryTransportConfig } from './types';
import { LogLevel } from './types';
import { isLevelEnabled } from './log-level';
import { shouldSendToSentry } from './event-filter';

interface SentryModule {
  init: (options: Record<string, unknown>) => void;
  captureException: (
    error: Error,
    context?: Record<string, unknown>,
  ) => void;
  captureMessage: (
    message: string,
    level?: string,
    context?: Record<string, unknown>,
  ) => void;
  addBreadcrumb: (
    breadcrumb: Record<string, unknown>,
  ) => void;
  setUser: (
    user: Record<string, unknown> | null,
  ) => void;
}

let sentryModule: SentryModule | undefined;

function initializeSentryTransport(
  config: SentryTransportConfig,
  sentry: SentryModule,
): void {
  sentryModule = sentry;

  sentry.init({
    dsn: config.dsn,
    environment: config.environment,
    release: config.release,
    tracesSampleRate: config.tracesSampleRate ?? 1.0,
    enableAutoPerformanceTracing:
      config.enablePerformanceTracing ?? false,
  });
}

const LEVEL_TO_SENTRY_SEVERITY: Record<
  LogLevel,
  string
> = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warning]: 'warning',
  [LogLevel.Error]: 'error',
  [LogLevel.Fatal]: 'fatal',
};

function buildSentryContext(
  entry: LogEntry,
): Record<string, unknown> {
  const context: Record<string, unknown> = {};

  if (entry.tag) {
    context.tags = { manual_log: entry.tag };
  }

  if (entry.data) {
    context.extra = { debug_context: entry.data };
  }

  return context;
}

function sendToSentry(
  entry: LogEntry,
  minimumLevel: LogLevel,
): void {
  if (!sentryModule) return;
  if (!isLevelEnabled(entry.level, minimumLevel)) return;
  if (!shouldSendToSentry(entry)) return;

  const context = buildSentryContext(entry);

  if (entry.error) {
    sentryModule.captureException(entry.error, context);
    return;
  }

  const severity =
    LEVEL_TO_SENTRY_SEVERITY[entry.level];
  sentryModule.captureMessage(
    entry.message,
    severity,
    context,
  );
}

function setSentryUserScope(userId: string): void {
  if (!sentryModule) return;
  sentryModule.setUser({ id: userId });
}

function clearSentryUserScope(): void {
  if (!sentryModule) return;
  sentryModule.setUser(null);
}

function addSentryBreadcrumb(
  breadcrumb: Record<string, unknown>,
): void {
  if (!sentryModule) return;
  sentryModule.addBreadcrumb(breadcrumb);
}

export type { SentryModule };
export {
  initializeSentryTransport,
  sendToSentry,
  setSentryUserScope,
  clearSentryUserScope,
  addSentryBreadcrumb,
};
