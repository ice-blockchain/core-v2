import type { IKeyValueStorage } from '@ion/storage';

import type { SupportedLocale } from './types';
import { LANGUAGE_PREFERENCE_KEY } from './create-localization';
import { restartApplication } from './restart-application';

interface ChangeLanguageInput {
  readonly locale: SupportedLocale;
  readonly storage: IKeyValueStorage;
}

export function changeLanguage(input: ChangeLanguageInput): void {
  input.storage.setString(LANGUAGE_PREFERENCE_KEY, input.locale);
  restartApplication();
}
