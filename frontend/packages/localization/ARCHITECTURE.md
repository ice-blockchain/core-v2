# @ion/localization Architecture

Cross-platform i18n engine for ION. Provides translation, plurals, locale detection, fallback chains, and language persistence. Works on React Native and Web.

## Public API

```typescript
// Engine — initialize once at app startup
export { createLocalization } from './src/create-localization';
export { registerTranslations } from './src/register-translations';

// Primary consumer API — static function, no hook needed
export { translate, getCurrentLocale } from './src/create-localization';

// Language management — persists to storage + restarts app
export { changeLanguage } from './src/change-language';

// Platform — device locale detection
export { getDeviceLocale } from './src/device-locale';
export { buildFallbackChain } from './src/fallback-chain';

// Config — single source of truth for supported locales
export { SUPPORTED_LOCALES, DEFAULT_LOCALE } from './src/supported-locales';

// Types
export type { LocalizationConfig, TranslationResource, SupportedLocale } from './src/types';
```

## Data Structures

```typescript
type SupportedLocale = 'en' | 'fr' | 'de';

interface TranslationResource {
  readonly namespace: string;         // e.g. 'auth-ui'
  readonly locale: SupportedLocale;
  readonly translations: Readonly<Record<string, string>>;
}
```

## Platform Resolution

| Module | Native | Web |
|--------|--------|-----|
| `device-locale` | `NativeModules.SettingsManager` (iOS), `NativeModules.I18nManager` (Android) | `navigator.languages[0]` |
| `restart-application` | `react-native-restart` | `window.location.reload()` |

## Locale Resolution Order

1. Stored user preference (via `@ion/storage` key-value)
2. Device locale (OS language setting)
3. `DEFAULT_LOCALE` (`'en'`)

## Distributed Translations

Each consumer package owns its translations in `src/translations/`:
- `en.ts` — canonical English keys (`as const`)
- `fr.ts`, `de.ts`, etc. — typed as `Record<EnglishKey, string>` (compile-time completeness)
- `index.ts` — exports namespace constant + `TranslationResource[]`

`registerTranslations()` validates at runtime that every `SUPPORTED_LOCALE` is covered. Missing locales crash the app at startup (fail-fast).

## Design Decisions

- **Static `translate()` not a hook**: App restarts on language change, so no re-render subscriptions needed. Saves ~7 kB by eliminating `react-i18next`.
- **i18next under the hood**: Proven plural rules (CLDR), interpolation, namespace support. No value in reimplementing.
- **`createInstance()` not global `init()`**: Testable, no global state leakage.
- **Eager registration**: Mobile loads all strings at startup. Lazy loading adds complexity with no benefit at current app size.
- **`SUPPORTED_LOCALES` as source of truth**: Consumer packages import this constant; runtime validation enforces coverage.

## Dependencies

- **Downstream**: `@ion/storage` (Foundation peer — language preference persistence)
- **Production**: `i18next`
- **Peer**: `react-native` (optional), `react-native-restart` (optional)
- **Upstream consumers**: all UI packages, app shells

## File Structure

```
src/
  types.ts                         # SupportedLocale, TranslationResource, LocalizationConfig
  supported-locales.ts             # SUPPORTED_LOCALES, DEFAULT_LOCALE
  device-locale.{ts,native.ts,web.ts}   # Platform-resolved locale detection
  fallback-chain.ts                # Builds locale fallback array
  create-localization.ts           # i18next instance + translate() + getCurrentLocale()
  register-translations.ts         # Namespace registration with locale coverage validation
  change-language.ts               # Persist preference + restart
  restart-application.{ts,native.ts,web.ts}  # Platform-resolved app restart
  *.test.ts                        # Colocated tests
index.ts                           # Public API re-exports
```
