export type PulseSubscriptionCallback = (soul: string, data: unknown) => void;

export interface PulseSignalConfig {
  readonly maxListenersPerPath?: number;
}

export interface PulseSignalInstance {
  readonly subscribe: (path: string, callback: PulseSubscriptionCallback) => () => void;
  readonly notify: (soul: string, data: unknown) => void;
  readonly getSubscriberCount: (path: string) => number;
  readonly destroy: () => void;
}
