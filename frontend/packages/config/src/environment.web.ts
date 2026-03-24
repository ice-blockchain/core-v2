import type { EnvironmentConfig } from './types';
import { validateEnvironmentConfig } from './validate-environment';

export const environmentConfig: EnvironmentConfig = validateEnvironmentConfig({
  APP_ENV: process.env.VITE_APP_ENV,
  API_BASE_URL: process.env.VITE_API_BASE_URL,
  RELAY_URL: process.env.VITE_RELAY_URL,
  LOG_LEVEL: process.env.VITE_LOG_LEVEL,
});
