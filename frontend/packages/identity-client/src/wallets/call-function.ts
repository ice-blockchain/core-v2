import type { WalletsDataSource } from '../data-sources/wallets-data-source';
import type { CallFunctionRequest, CallFunctionResponse } from './types';

interface CallFunctionDeps {
  walletsDataSource: WalletsDataSource;
}

interface CallFunctionOptions {
  username: string;
  network: string;
  request: CallFunctionRequest;
}

export async function callFunction(options: CallFunctionOptions, deps: CallFunctionDeps): Promise<CallFunctionResponse> {
  return deps.walletsDataSource.callFunction(options.network, options.request, options.username);
}
