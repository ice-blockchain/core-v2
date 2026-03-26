import type { HttpClient } from '@ion/network';
import type { UserRegistrationChallenge, RegistrationResult } from '../types';

export interface RegistrationDataSource {
  initRegistration(email: string, earlyAccessEmail?: string): Promise<UserRegistrationChallenge>;
  completeRegistration(
    credential: RegistrationCredentialPayload,
    tempToken: string,
    earlyAccessEmail?: string,
  ): Promise<RegistrationResult>;
}

export interface RegistrationCredentialPayload {
  firstFactorCredential: {
    credentialKind: 'Fido2' | 'PasswordProtectedKey';
    credentialInfo: Record<string, unknown>;
    encryptedPrivateKey?: string;
  };
}

export function createRegistrationDataSource(httpClient: HttpClient): RegistrationDataSource {
  return {
    initRegistration(email, earlyAccessEmail) {
      return httpClient.post<UserRegistrationChallenge>('/auth/registration/delegated', {
        body: { email, ...(earlyAccessEmail != null && { earlyAccessEmail }) },
      });
    },

    completeRegistration(credential, tempToken, earlyAccessEmail) {
      return httpClient.post<RegistrationResult>('/auth/registration/enduser', {
        body: { ...credential, ...(earlyAccessEmail != null && { earlyAccessEmail }) },
        headers: { Authorization: `Bearer ${tempToken}` },
      });
    },
  };
}
