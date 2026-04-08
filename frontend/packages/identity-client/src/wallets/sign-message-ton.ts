import type { HttpClient } from '@ion/network';

import { executeSignedRequest } from '../auth/execute-signed-request';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { SigningContext } from '../types';
import type { GenerateSignatureResponse } from './types';

interface SignedRequestDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

export async function signMessageTon(
  username: string,
  signingKeyId: string,
  message: string,
  signingContext: SigningContext,
  deps: SignedRequestDeps,
): Promise<GenerateSignatureResponse> {
  return executeSignedRequest<GenerateSignatureResponse>(
    {
      username,
      httpMethod: 'POST',
      httpPath: `/keys/${encodeURIComponent(signingKeyId)}/signatures`,
      body: { blockchainKind: 'Ton', kind: 'Message', message },
      signingContext,
    },
    deps,
  );
}
