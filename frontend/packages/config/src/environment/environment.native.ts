import Config from 'react-native-config';
import { Platform } from 'react-native';

import type { EnvironmentConfig } from './types';
import { validateEnvironmentConfig } from './validate-environment';

const rawConfig = Config as Record<string, string | undefined>;
const identityAppId = Platform.OS === 'ios'
  ? rawConfig.IDENTITY_IOS_APP_ID
  : rawConfig.IDENTITY_ANDROID_APP_ID;

export const environmentConfig: EnvironmentConfig = validateEnvironmentConfig({
  ...rawConfig,
  IDENTITY_APP_ID: identityAppId,
});
