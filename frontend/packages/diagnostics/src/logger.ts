import type {
  DiagnosticsConfig,
  LogOptions,
  ErrorLogOptions,
  Breadcrumb,
} from './types';
import { LogLevel } from './types';
import { createLogEntry } from './log-entry';
import { LogBuffer } from './log-buffer';
import { sendToConsole } from './console-transport';
import type { SentryModule } from './sentry-transport';
import {
  setSentryModule,
  sendToSentry,
  setSentryUserScope,
  clearSentryUserScope,
  addSentryBreadcrumb,
} from './sentry-transport';
import { installGlobalErrorHandler } from './global-error-handler';

declare const __DEV__: boolean | undefined;
declare const process: { env?: { NODE_ENV?: string } };

let buffer: LogBuffer | undefined;
let consoleLevel: LogLevel = LogLevel.Debug;
let sentryLevel: LogLevel = LogLevel.Error;
let isInitialized = false;

function isDevelopment(): boolean {
  if (typeof __DEV__ !== 'undefined') return __DEV__;
  if (typeof process !== 'undefined') {
    return process.env?.NODE_ENV === 'development';
  }
  return false;
}

function resolveDefaultConsoleLevel(): LogLevel {
  return isDevelopment()
    ? LogLevel.Debug
    : LogLevel.Warning;
}

function initialize(config: DiagnosticsConfig): void {
  if (isInitialized) return;

  consoleLevel =
    config.consoleLevel ?? resolveDefaultConsoleLevel();
  sentryLevel = config.sentryLevel ?? LogLevel.Error;
  buffer = new LogBuffer(config.bufferCapacity);

  if (config.sentry) {
    setSentryModule(
      config.sentry as unknown as SentryModule,
    );
  }

  if (config.captureGlobalErrors !== false) {
    installGlobalErrorHandler(fatal);
  }

  isInitialized = true;
}

function getOrCreateBuffer(): LogBuffer {
  if (!buffer) {
    buffer = new LogBuffer();
  }
  return buffer;
}

function log(
  level: LogLevel,
  message: string,
  options?: LogOptions | ErrorLogOptions,
): void {
  const entry = createLogEntry(level, message, options);
  getOrCreateBuffer().add(entry);
  sendToConsole(entry, consoleLevel);
  sendToSentry(entry, sentryLevel);
}

function debug(
  message: string,
  options?: LogOptions,
): void {
  log(LogLevel.Debug, message, options);
}

function info(
  message: string,
  options?: LogOptions,
): void {
  log(LogLevel.Info, message, options);
}

function warning(
  message: string,
  options?: LogOptions,
): void {
  log(LogLevel.Warning, message, options);
}

function error(
  message: string,
  options?: ErrorLogOptions,
): void {
  log(LogLevel.Error, message, options);
}

function fatal(
  message: string,
  options?: ErrorLogOptions,
): void {
  log(LogLevel.Fatal, message, options);
}

function addBreadcrumb(breadcrumb: Breadcrumb): void {
  addSentryBreadcrumb({
    message: breadcrumb.message,
    category: breadcrumb.category,
    level: breadcrumb.level,
    data: breadcrumb.data,
  });
}

function setUser(userId: string): void {
  setSentryUserScope(userId);
}

function clearUser(): void {
  clearSentryUserScope();
}

function getBuffer(): LogBuffer {
  return getOrCreateBuffer();
}

const Logger = {
  initialize,
  debug,
  info,
  warning,
  error,
  fatal,
  addBreadcrumb,
  setUser,
  clearUser,
  getBuffer,
} as const;

export { Logger };
