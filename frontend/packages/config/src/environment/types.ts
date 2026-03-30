export type AppEnvironment = 'staging' | 'testnet' | 'production';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EnvironmentConfig {
  appEnvironment: AppEnvironment;
  apiBaseUrl: string;
  identityAppId: string;
  relayUrl: string;
  logLevel: LogLevel;
}
