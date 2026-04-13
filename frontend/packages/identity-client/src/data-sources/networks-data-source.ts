import type { HttpClient } from '@ion/network';

import type { EstimateFee } from '../wallets/types';

export interface NetworksDataSource {
  estimateFees(networks: string[], username: string): Promise<EstimateFee[]>;
}

export function createNetworksDataSource(httpClient: HttpClient): NetworksDataSource {
  return {
    async estimateFees(networks, username) {
      const { body } = await httpClient.get<EstimateFee | EstimateFee[]>('/networks/fees', {
        query: { network: networks.join(',') },
        headers: { 'X-Username': username },
      });
      return Array.isArray(body) ? body : [body];
    },
  };
}
