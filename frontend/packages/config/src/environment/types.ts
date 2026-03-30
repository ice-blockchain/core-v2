export type AppEnvironment = 'staging' | 'testnet' | 'production';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EnvironmentConfig {
  appEnvironment: AppEnvironment;
  apiBaseUrl: string;
  relayUrl: string;
  logLevel: LogLevel;
}
