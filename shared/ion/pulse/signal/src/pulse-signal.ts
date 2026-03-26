import type { PulseSignal, PulseSignalCallback } from './types';

function doesPathMatch(pattern: string, emittedPath: string): boolean {
  if (pattern === emittedPath) return true;

  const patternSegments = pattern.split('/');
  const lastSegment = patternSegments[patternSegments.length - 1];

  if (lastSegment !== '*' && lastSegment !== '**') return false;

  const prefixSegments = patternSegments.slice(0, -1);
  const pathSegments = emittedPath.split('/');

  if (pathSegments.length <= prefixSegments.length) return false;

  const prefixMatches = prefixSegments.every(
    (segment, index) => segment === pathSegments[index],
  );
  if (!prefixMatches) return false;

  if (lastSegment === '*') {
    return pathSegments.length === prefixSegments.length + 1;
  }

  return true;
}

export function createPulseSignal(): PulseSignal {
  const subscriptions = new Map<string, Set<PulseSignalCallback>>();

  function subscribe(path: string, callback: PulseSignalCallback): () => void {
    let callbacks = subscriptions.get(path);
    if (!callbacks) {
      callbacks = new Set();
      subscriptions.set(path, callbacks);
    }
    callbacks.add(callback);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        subscriptions.delete(path);
      }
    };
  }

  function emit(path: string, data: unknown): void {
    for (const [pattern, callbacks] of subscriptions) {
      if (doesPathMatch(pattern, path)) {
        for (const callback of callbacks) {
          callback(data, path);
        }
      }
    }
  }

  function listSubscriptions(): string[] {
    return [...subscriptions.keys()];
  }

  function subscriberCount(path: string): number {
    return subscriptions.get(path)?.size ?? 0;
  }

  function destroy(): void {
    subscriptions.clear();
  }

  return { subscribe, emit, listSubscriptions, subscriberCount, destroy };
}
