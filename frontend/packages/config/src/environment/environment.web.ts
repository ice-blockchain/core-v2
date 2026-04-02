import type { EnvironmentConfig } from './types';
import { validateEnvironmentConfig } from './validate-environment';

const rawApiBaseUrl = process.env.VITE_API_BASE_URL ?? '';
const isProduction = process.env.VITE_APP_ENV === 'production';

if (isProduction && !rawApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL is required in production');
}

export const environmentConfig: EnvironmentConfig = rawApiBaseUrl
  ? validateEnvironmentConfig({
      APP_ENV: process.env.VITE_APP_ENV,
      API_BASE_URL: rawApiBaseUrl,
      IDENTITY_APP_ID: process.env.VITE_IDENTITY_APP_ID,
      RELAY_URL: process.env.VITE_RELAY_URL,
      LOG_LEVEL: process.env.VITE_LOG_LEVEL,
    })
  : {
      ...validateEnvironmentConfig({
        APP_ENV: process.env.VITE_APP_ENV,
        API_BASE_URL: 'https://proxy.local',
        IDENTITY_APP_ID: process.env.VITE_IDENTITY_APP_ID,
        RELAY_URL: process.env.VITE_RELAY_URL,
        LOG_LEVEL: process.env.VITE_LOG_LEVEL,
      }),
      apiBaseUrl: '',
    };
