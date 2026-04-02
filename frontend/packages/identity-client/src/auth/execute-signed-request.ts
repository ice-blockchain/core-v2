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
  const userAction = await signUserAction(
    {
      username: input.username,
      httpMethod: input.httpMethod,
      httpPath: input.httpPath,
      body: input.body ?? {},
      signingContext: input.signingContext,
    },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
  const headers = {
    'X-Username': input.username,
    'X-Useraction': btoa(userAction),
  };
  return sendRequest<T>(deps.httpClient, input, headers);
}

async function sendRequest<T>(
  httpClient: HttpClient,
  input: SignedRequestInput,
  headers: Record<string, string>,
): Promise<T> {
  const method = input.httpMethod.toLowerCase() as 'post' | 'put' | 'patch' | 'delete';
  if (method === 'delete') {
    const { body } = await httpClient.delete<T>(input.httpPath, { headers });
    return body;
  }
  const { body } = await httpClient[method]<T>(input.httpPath, { headers, body: input.body });
  return body;
}
