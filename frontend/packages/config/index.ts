export { environmentConfig } from './src/environment/environment';
export type { AppEnvironment, EnvironmentConfig, LogLevel } from './src/environment/types';

export { createRemoteConfig } from './src/remote-config/create-remote-config';
export { ConfigError, ConfigErrorCode } from './src/remote-config/remote-config-error';
export type {
  RemoteConfigService,
  RemoteConfigOptions,
  GetConfigOptions,
  AppConfigWithVersion,
} from './src/remote-config/remote-config-types';
