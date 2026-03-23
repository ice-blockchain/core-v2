import type { LogEntry } from './types';
import { LogLevel } from './types';
import { isLevelEnabled } from './log-level';
import { getLevelLabel } from './log-level';

type ConsoleMethodName = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_TO_METHOD_NAME: Record<LogLevel, ConsoleMethodName> = {
  [LogLevel.Debug]: 'debug',
  [LogLevel.Info]: 'info',
  [LogLevel.Warning]: 'warn',
  [LogLevel.Error]: 'error',
  [LogLevel.Fatal]: 'error',
};

function formatConsoleMessage(entry: LogEntry): string {
  const label = getLevelLabel(entry.level);
  const tag = entry.tag ? ` [${entry.tag}]` : '';
  return `[${label}]${tag} ${entry.message}`;
}

function buildConsoleArgs(entry: LogEntry): unknown[] {
  const args: unknown[] = [];

  if (entry.data) {
    args.push(entry.data);
  }

  if (entry.error) {
    args.push(entry.error);
  }

  return args;
}

function sendToConsole(
  entry: LogEntry,
  minimumLevel: LogLevel,
): void {
  if (!isLevelEnabled(entry.level, minimumLevel)) return;

  const methodName = LEVEL_TO_METHOD_NAME[entry.level];
  const method = console[methodName];
  const message = formatConsoleMessage(entry);
  const args = buildConsoleArgs(entry);

  method(message, ...args);
}

export { sendToConsole, formatConsoleMessage };
