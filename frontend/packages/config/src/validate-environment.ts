import type { AppEnvironment, EnvironmentConfig, LogLevel } from './types';

const REQUIRED_KEYS = ['APP_ENV', 'API_BASE_URL', 'RELAY_URL', 'LOG_LEVEL'] as const;

const VALID_ENVIRONMENTS: AppEnvironment[] = ['staging', 'testnet', 'production'];
const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function validateUrl(value: string, name: string, protocol: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`Invalid ${name}: "${value}". Must be a valid URL`);
  }

  if (!value.startsWith(`${protocol}://`)) {
    throw new Error(`Invalid ${name}: "${value}". Must use ${protocol}://`);
  }
}

export function validateEnvironmentConfig(
  config: Record<string, string | undefined>,
): EnvironmentConfig {
  for (const key of REQUIRED_KEYS) {
    if (!config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const appEnvironment = config.APP_ENV as AppEnvironment;
  if (!VALID_ENVIRONMENTS.includes(appEnvironment)) {
    throw new Error(
      `Invalid APP_ENV: "${appEnvironment}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`,
    );
  }

  const logLevel = config.LOG_LEVEL as LogLevel;
  if (!VALID_LOG_LEVELS.includes(logLevel)) {
    throw new Error(
      `Invalid LOG_LEVEL: "${logLevel}". Must be one of: ${VALID_LOG_LEVELS.join(', ')}`,
    );
  }

  const apiBaseUrl = config.API_BASE_URL as string;
  const relayUrl = config.RELAY_URL as string;
  validateUrl(apiBaseUrl, 'API_BASE_URL', 'https');
  validateUrl(relayUrl, 'RELAY_URL', 'wss');

  return { appEnvironment, apiBaseUrl, relayUrl, logLevel };
}
