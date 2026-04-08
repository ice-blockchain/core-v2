import type { WalletsDataSource } from '../data-sources/wallets-data-source';
import type { CallFunctionRequest } from './types';

interface CallFunctionDeps {
  walletsDataSource: WalletsDataSource;
}

interface CallFunctionOptions {
  username: string;
  network: string;
  request: CallFunctionRequest;
}

export async function callFunction(options: CallFunctionOptions, deps: CallFunctionDeps): Promise<unknown> {
  return deps.walletsDataSource.callFunction(options.network, options.request, options.username);
}
