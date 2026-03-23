import type { LogEntry, LogOptions, ErrorLogOptions } from './types';
import type { LogLevel } from './types';

function createLogEntry(
  level: LogLevel,
  message: string,
  options?: LogOptions | ErrorLogOptions,
): LogEntry {
  const entry: LogEntry = {
    timestamp: Date.now(),
    level,
    message,
  };

  if (options?.tag) {
    entry.tag = options.tag;
  }

  if (options?.data) {
    entry.data = options.data;
  }

  if (options && 'error' in options && options.error) {
    entry.error = options.error;
  }

  return entry;
}

export { createLogEntry };
