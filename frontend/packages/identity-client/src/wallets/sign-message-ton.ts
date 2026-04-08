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

interface SignMessageTonOptions {
  username: string;
  signingKeyId: string;
  message: string;
  signingContext: SigningContext;
}

export async function signMessageTon(options: SignMessageTonOptions, deps: SignedRequestDeps): Promise<GenerateSignatureResponse> {
  return executeSignedRequest<GenerateSignatureResponse>(
    {
      username: options.username,
      httpMethod: 'POST',
      httpPath: `/keys/${encodeURIComponent(options.signingKeyId)}/signatures`,
      body: { blockchainKind: 'Ton', kind: 'Message', message: options.message },
      signingContext: options.signingContext,
    },
    deps,
  );
}
