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

export async function generateSignature(
  username: string,
  walletId: string,
  request: GenerateSignatureRequest,
  signingContext: SigningContext,
  deps: SignedRequestDeps,
): Promise<GenerateSignatureResponse> {
  const body = prepareSignatureBody(request);
  return executeSignedRequest<GenerateSignatureResponse>(
    {
      username,
      httpMethod: 'POST',
      httpPath: `/wallets/${encodeURIComponent(walletId)}/signatures`,
      body,
      signingContext,
    },
    deps,
  );
}
