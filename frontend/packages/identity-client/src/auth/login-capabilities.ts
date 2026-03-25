import type { LoginDataSource } from '../data-sources/login-data-source';
import type { LoginCapabilities } from '../types';
import { isPasskeyAvailable } from '../passkey';

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
    };
  } catch {
    return { supportsPasskey: false, supportsPassword: false, identityFound: false };
  }
}
