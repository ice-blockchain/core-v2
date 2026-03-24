import Config from 'react-native-config';

import type { AppEnvironment, EnvironmentConfig, LogLevel } from './types';

const REQUIRED_KEYS = ['APP_ENV', 'API_BASE_URL', 'RELAY_URL', 'LOG_LEVEL'] as const;

const VALID_ENVIRONMENTS: AppEnvironment[] = ['staging', 'testnet', 'production'];
const VALID_LOG_LEVELS: LogLevel[] = ['debug', 'info', 'warn', 'error'];

function validateEnvironmentConfig(): EnvironmentConfig {
  for (const key of REQUIRED_KEYS) {
    if (!Config[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const appEnvironment = Config.APP_ENV as AppEnvironment;
  if (!VALID_ENVIRONMENTS.includes(appEnvironment)) {
    throw new Error(`Invalid APP_ENV: "${appEnvironment}". Must be one of: ${VALID_ENVIRONMENTS.join(', ')}`);
  }

  const logLevel = Config.LOG_LEVEL as LogLevel;
  if (!VALID_LOG_LEVELS.includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL: "${logLevel}". Must be one of: ${VALID_LOG_LEVELS.join(', ')}`);
  }

  return {
    appEnvironment,
    apiBaseUrl: Config.API_BASE_URL as string,
    relayUrl: Config.RELAY_URL as string,
    logLevel,
  };
}

export const environmentConfig: EnvironmentConfig = validateEnvironmentConfig();
