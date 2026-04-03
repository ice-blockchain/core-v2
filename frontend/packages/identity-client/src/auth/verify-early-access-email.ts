import type { HttpClient } from '@ion/network';
import { NetworkError } from '@ion/network';
import { IdentityError, IdentityErrorCode } from '../errors';

interface VerifyEarlyAccessDeps {
  httpClient: HttpClient;
}

export async function verifyEarlyAccessEmail(
  email: string,
  deps: VerifyEarlyAccessDeps,
): Promise<void> {
  try {
    await deps.httpClient.get('/v1/early-access-users', {
      query: { email },
    });
  } catch (error) {
    if (error instanceof NetworkError) {
      const body = error.responseBody as Record<string, unknown> | undefined;
      if (body && body.code === 'INVALID_EMAIL') {
        throw new IdentityError(IdentityErrorCode.INVALID_EMAIL, 'Email is not eligible for early access');
      }
    }
    throw error;
  }
}
