enum LogLevel {
  Debug = 0,
  Info = 1,
  Warning = 2,
  Error = 3,
  Fatal = 4,
}

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  tag?: string;
  data?: Record<string, unknown>;
  error?: Error;
}

interface LogOptions {
  tag?: string;
  data?: Record<string, unknown>;
}

interface ErrorLogOptions extends LogOptions {
  error?: Error;
}

interface Breadcrumb {
  message: string;
  category?: string;
  level?: LogLevel;
  data?: Record<string, unknown>;
}

interface SentryTransportConfig {
  dsn: string;
  environment: string;
  release: string;
  tracesSampleRate?: number;
  enablePerformanceTracing?: boolean;
}

interface SentryConfig {
  transport: SentryTransportConfig;
  module: Record<string, unknown>;
}

interface DiagnosticsConfig {
  consoleLevel?: LogLevel;
  sentryLevel?: LogLevel;
  bufferCapacity?: number;
  sentry?: SentryConfig;
  captureGlobalErrors?: boolean;
}

export { LogLevel };
export type {
  LogEntry,
  LogOptions,
  ErrorLogOptions,
  Breadcrumb,
  SentryTransportConfig,
  SentryConfig,
  DiagnosticsConfig,
};
