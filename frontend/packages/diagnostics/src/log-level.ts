import { LogLevel } from './types';

const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.Debug]: 'DEBUG',
  [LogLevel.Info]: 'INFO',
  [LogLevel.Warning]: 'WARN',
  [LogLevel.Error]: 'ERROR',
  [LogLevel.Fatal]: 'FATAL',
};

function isLevelEnabled(
  entryLevel: LogLevel,
  minimumLevel: LogLevel,
): boolean {
  return entryLevel >= minimumLevel;
}

function getLevelLabel(level: LogLevel): string {
  return LOG_LEVEL_LABELS[level];
}

export { isLevelEnabled, getLevelLabel };
