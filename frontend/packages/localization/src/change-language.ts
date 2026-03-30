import { Logger } from '@ion/diagnostics';
import { createKeyValueStorage } from '@ion/storage/key-value-storage';

import type { SupportedLocale } from './types';
import { LANGUAGE_PREFERENCE_KEY } from './create-localization';
import { restartApplication } from './restart-application';

const storage = createKeyValueStorage({ id: 'ion-localization' });

export function changeLanguage(locale: SupportedLocale): void {
  Logger.info('Language changed', {
    tag: 'localization',
    data: { locale },
  });
  storage.setString(LANGUAGE_PREFERENCE_KEY, locale);
  restartApplication();
}
