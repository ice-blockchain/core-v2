import type { HttpClient } from '@ion/network';

import { executeSignedRequest } from '../auth/execute-signed-request';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { SigningContext } from '../types';
import type { TransferRequest, WalletTransferRequest } from './types';

interface MakeTransferDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

function stripUndefinedFields(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null),
  );
}

interface MakeTransferOptions {
  username: string;
  walletId: string;
  transfer: TransferRequest;
  signingContext: SigningContext;
}

export async function makeTransfer(options: MakeTransferOptions, deps: MakeTransferDeps): Promise<WalletTransferRequest> {
  const body = stripUndefinedFields(options.transfer as unknown as Record<string, unknown>);
  return executeSignedRequest<WalletTransferRequest>(
    {
      username: options.username,
      httpMethod: 'POST',
      httpPath: `/wallets/${encodeURIComponent(options.walletId)}/transfers`,
      body,
      signingContext: options.signingContext,
    },
    deps,
  );
}
