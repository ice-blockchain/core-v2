import Config from 'react-native-config';

import type { EnvironmentConfig } from './types';
import { validateEnvironmentConfig } from './validate-environment';

export const environmentConfig: EnvironmentConfig = validateEnvironmentConfig(
  Config as Record<string, string | undefined>,
);
