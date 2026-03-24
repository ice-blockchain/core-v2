import type { EnvironmentConfig } from './types';
import { validateEnvironmentConfig } from './validate-environment';

export const environmentConfig: EnvironmentConfig = validateEnvironmentConfig({
  APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  RELAY_URL: process.env.NEXT_PUBLIC_RELAY_URL,
  LOG_LEVEL: process.env.NEXT_PUBLIC_LOG_LEVEL,
});
