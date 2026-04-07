import type { IdentityClient } from '@ion/identity-client';
import { Logger } from '@ion/diagnostics';
import type { PasswordLoginResult } from '@ion/auth-ui';
import { mapIdentityError } from './error-messages';

export async function loginWithPassword(
  identityClient: IdentityClient,
  identityKeyName: string,
  password: string,
): Promise<PasswordLoginResult> {
  try {
    await identityClient.loginWithPassword({ username: identityKeyName, password });
    Logger.info('Password login succeeded', { tag: 'auth' });
    return { outcome: 'authenticated' };
  } catch (error) {
    const wrapped = error instanceof Error ? error : new Error(String(error));
    Logger.error('Password login failed', { tag: 'auth', error: wrapped, data: { identityKeyName } });
    return { outcome: 'error', error: mapIdentityError(error) };
  }
}
