import type { HttpClient } from '@ion/network';

import { executeSignedRequest } from '../auth/execute-signed-request';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { SigningContext } from '../types';
import type { GenerateSignatureRequest, GenerateSignatureResponse } from './types';

interface SignedRequestDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

function prepareSignatureBody(request: GenerateSignatureRequest): GenerateSignatureRequest {
  if (request.kind === 'Message') {
    const hexMessage = Buffer.from(request.message).toString('hex');
    return { ...request, message: hexMessage };
  }
  return request;
}

interface GenerateSignatureOptions {
  username: string;
  walletId: string;
  request: GenerateSignatureRequest;
  signingContext: SigningContext;
}

export async function generateSignature(options: GenerateSignatureOptions, deps: SignedRequestDeps): Promise<GenerateSignatureResponse> {
  const body = prepareSignatureBody(options.request);
  return executeSignedRequest<GenerateSignatureResponse>(
    {
      username: options.username,
      httpMethod: 'POST',
      httpPath: `/wallets/${encodeURIComponent(options.walletId)}/signatures`,
      body,
      signingContext: options.signingContext,
    },
    deps,
  );
}
