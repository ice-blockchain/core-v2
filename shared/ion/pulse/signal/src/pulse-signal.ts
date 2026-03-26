import type { PulseSubscriptionCallback, PulseSignalConfig, PulseSignalInstance } from './types';

const DEFAULT_MAX_LISTENERS = 100;

function matchesWildcard(pattern: string, soul: string): boolean {
  if (!pattern.endsWith('/*')) return pattern === soul;

  const prefix = pattern.slice(0, -1);
  return soul.startsWith(prefix);
}

function findMatchingCallbacks(
  listeners: Map<string, Set<PulseSubscriptionCallback>>,
  soul: string,
): PulseSubscriptionCallback[] {
  const matched: PulseSubscriptionCallback[] = [];

  for (const [path, callbacks] of listeners) {
    if (matchesWildcard(path, soul)) {
      for (const callback of callbacks) {
        matched.push(callback);
      }
    }
  }

  return matched;
}

export function createPulseSignal(config?: PulseSignalConfig): PulseSignalInstance {
  const maxListeners = config?.maxListenersPerPath ?? DEFAULT_MAX_LISTENERS;
  const listeners = new Map<string, Set<PulseSubscriptionCallback>>();

  function subscribe(path: string, callback: PulseSubscriptionCallback): () => void {
    if (!listeners.has(path)) {
      listeners.set(path, new Set());
    }

    const pathListeners = listeners.get(path)!;

    if (pathListeners.size >= maxListeners) {
      throw new Error(`Max listeners (${maxListeners}) exceeded for path: ${path}`);
    }

    pathListeners.add(callback);

    return () => {
      pathListeners.delete(callback);
      if (pathListeners.size === 0) {
        listeners.delete(path);
      }
    };
  }

  function notify(soul: string, data: unknown): void {
    const callbacks = findMatchingCallbacks(listeners, soul);
    for (const callback of callbacks) {
      callback(soul, data);
    }
  }

  function getSubscriberCount(path: string): number {
    return listeners.get(path)?.size ?? 0;
  }

  function destroy(): void {
    listeners.clear();
  }

  return { subscribe, notify, getSubscriberCount, destroy };
}
