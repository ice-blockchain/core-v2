import { fetch as undiciFetch, Response as UndiciResponse } from 'undici';
import type { RequestInit as UndiciRequestInit } from 'undici';
import createPinnedDispatcher from './create-pinned-dispatcher.js';
import type { ValidatedEndpoint } from './validate-endpoint.js';

export interface PinnedFetchOptions {
  url: string;
  init: RequestInit;
  validatedEndpoint: ValidatedEndpoint;
}

export interface PinnedFetchResult {
  response: UndiciResponse;
  cleanup: () => Promise<void>;
}

export default async function fetchWithPinnedDns(
  options: PinnedFetchOptions,
): Promise<PinnedFetchResult> {
  const { url, init, validatedEndpoint } = options;
  const dispatcher = createPinnedDispatcher(
    validatedEndpoint.ip,
    validatedEndpoint.family,
  );

  try {
    const response = await undiciFetch(url, {
      ...init,
      dispatcher,
    } as UndiciRequestInit);

    return {
      response,
      cleanup: () => dispatcher.close(),
    };
  } catch (err) {
    await dispatcher.close();
    throw err;
  }
}
