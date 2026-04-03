import type { HttpClient } from '@ion/network';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { signUserAction } from './sign-user-action';

interface ExecuteSignedRequestDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

interface SignedRequestInput {
  username: string;
  httpMethod: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  httpPath: string;
  body?: unknown;
  signingContext: { kind: 'password'; password: string } | { kind: 'passkey' };
}

export async function executeSignedRequest<T>(
  input: SignedRequestInput,
  deps: ExecuteSignedRequestDeps,
): Promise<T> {
  const bodyToSend = input.body ?? {};
  const userAction = await signUserAction(
    {
      username: input.username,
      httpMethod: input.httpMethod,
      httpPath: input.httpPath,
      body: bodyToSend,
      signingContext: input.signingContext,
    },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
  const headers = {
    'X-Username': input.username,
    'X-Useraction': userAction,
  };
  return sendRequest<T>({
    httpClient: deps.httpClient, httpMethod: input.httpMethod, httpPath: input.httpPath, body: bodyToSend, headers,
  });
}

interface SendRequestInput {
  httpClient: HttpClient;
  httpMethod: SignedRequestInput['httpMethod'];
  httpPath: string;
  body: unknown;
  headers: Record<string, string>;
}

async function sendRequest<T>(input: SendRequestInput): Promise<T> {
  const method = input.httpMethod.toLowerCase() as 'post' | 'put' | 'patch' | 'delete';
  if (method === 'delete') {
    const resp = await input.httpClient.delete<T>(input.httpPath, { headers: input.headers });
    return resp.body;
  }
  const resp = await input.httpClient[method]<T>(input.httpPath, { headers: input.headers, body: input.body });
  return resp.body;
}
