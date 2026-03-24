// Types — shared
export type { ConnectionState, NetworkErrorCode, CancelableRequest, UploadProgress } from './shared-types';

// Types — events (public listener only, NOT NetworkEventEmitter)
export type { NetworkEvent, NetworkEventListener, NetworkStateProvider } from './event-types';

// Types — HTTP
export type {
  HttpClient,
  HttpClientConfig,
  RequestOptions,
  RequestOptionsWithBody,
  UploadOptions,
} from './http-types';

// Types — interceptors
export type { Interceptor, InterceptedRequest, InterceptedResponse } from './interceptor-types';

// Types — auth
export type { TokenStorage } from './auth-types';

// Types — retry
export type { RetryConfig } from './retry-types';

// Types — long polling
export type {
  LongPollClient,
  LongPollClientConfig,
  AdaptivePollingConfig,
  PayloadSerializer,
  SyncRequest,
  SyncResponse,
} from './long-poll-types';

// Types — queue
export type {
  RequestQueue,
  QueuedRequest,
  RequestQueueConfig,
  QueueStorage,
  ReplayResult,
} from './queue-types';

// Implementations
export { NetworkError } from './network-error';
export { createConnectionStateMachine } from './connection-state';
export type { ConnectionStateMachine } from './connection-state';
export { createNetworkEventEmitter } from './network-event-emitter';
export { createHttpClient } from './http-client';
export { createBearerAuthInterceptor } from './bearer-auth-interceptor';
export { createRequestQueue } from './request-queue';
export { createLongPollClient } from './long-poll-client';
