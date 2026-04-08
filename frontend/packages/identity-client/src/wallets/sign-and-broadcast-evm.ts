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

interface SignAndBroadcastEvmOptions {
  username: string;
  walletId: string;
  request: EvmBroadcastRequest;
  signingContext: SigningContext;
}

export async function signAndBroadcastEvm(options: SignAndBroadcastEvmOptions, deps: SignedRequestDeps): Promise<WalletTransferRequest> {
  return executeSignedRequest<WalletTransferRequest>(
    {
      username: options.username,
      httpMethod: 'POST',
      httpPath: `/wallets/${encodeURIComponent(options.walletId)}/transactions`,
      body: options.request,
      signingContext: options.signingContext,
    },
    deps,
  );
}
