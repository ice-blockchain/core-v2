import type { HttpClient } from '@ion/network';

import { executeSignedRequest } from '../auth/execute-signed-request';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { SigningContext } from '../types';
import type { EvmBroadcastRequest, WalletTransferRequest } from './types';

interface SignedRequestDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

export async function signAndBroadcastEvm(
  username: string,
  walletId: string,
  request: EvmBroadcastRequest,
  signingContext: SigningContext,
  deps: SignedRequestDeps,
): Promise<WalletTransferRequest> {
  return executeSignedRequest<WalletTransferRequest>(
    {
      username,
      httpMethod: 'POST',
      httpPath: `/wallets/${encodeURIComponent(walletId)}/transactions`,
      body: request,
      signingContext,
    },
    deps,
  );
}
