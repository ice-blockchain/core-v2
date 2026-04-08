import type { WalletsDataSource } from '../data-sources/wallets-data-source';
import type { CallFunctionRequest } from './types';

interface CallFunctionDeps {
  walletsDataSource: WalletsDataSource;
}

export async function callFunction(
  username: string,
  network: string,
  request: CallFunctionRequest,
  deps: CallFunctionDeps,
): Promise<unknown> {
  return deps.walletsDataSource.callFunction(network, request, username);
}
