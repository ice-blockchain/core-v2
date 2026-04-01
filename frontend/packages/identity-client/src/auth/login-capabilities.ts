import { NetworkError } from '@ion/network';
import type { LoginDataSource } from '../data-sources/login-data-source';
import type { LoginCapabilities } from '../types';
import { isPasskeyAvailable } from '../platform/passkey';

function parseTwoFACount(error: NetworkError): number | null {
  const body = error.responseBody as Record<string, unknown> | undefined;
  const data = body?.data as Record<string, unknown> | undefined;
  return typeof data?.n === 'number' ? data.n : null;
}

export async function getLoginCapabilities(
  username: string,
  loginDataSource: LoginDataSource,
): Promise<LoginCapabilities> {
  try {
    const challenge = await loginDataSource.initLogin(username);
    const hasWebauthn = (challenge.allowCredentials.webauthn?.length ?? 0) > 0;
    const hasPassword = (challenge.allowCredentials.passwordProtectedKey?.length ?? 0) > 0;
    return {
      supportsPasskey: hasWebauthn && isPasskeyAvailable(),
      supportsPassword: hasPassword,
      identityFound: true,
      twoFAOptionsCount: null,
    };
  } catch (error) {
    if (error instanceof NetworkError && error.status === 403) {
      return { supportsPasskey: false, supportsPassword: false, identityFound: true, twoFAOptionsCount: parseTwoFACount(error) };
    }
    if (error instanceof NetworkError && (error.status === 401 || error.status === 404)) {
      return { supportsPasskey: false, supportsPassword: false, identityFound: false, twoFAOptionsCount: null };
    }
    throw error;
  }
}
