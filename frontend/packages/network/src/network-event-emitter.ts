import { Logger } from '@ion/diagnostics';
import type {
  NetworkEvent,
  NetworkEventEmitter,
} from './event-types';

interface EventEmitterOptions {
  maxListenersPerEvent?: number;
}

type ListenerMap = Map<string, Set<(event: NetworkEvent) => void>>;

const DEFAULT_MAX_LISTENERS = 50;
const LEAK_WARNING_THRESHOLD = 0.8;

function getOrCreateListenerSet(
  listeners: ListenerMap,
  type: string,
): Set<(event: NetworkEvent) => void> {
  let set = listeners.get(type);
  if (!set) {
    set = new Set();
    listeners.set(type, set);
  }
  return set;
}

function checkLeakWarning(
  type: string,
  count: number,
  maxListeners: number,
): void {
  const threshold = Math.floor(maxListeners * LEAK_WARNING_THRESHOLD);
  if (count >= threshold) {
    Logger.warning(
      `Possible listener leak: ${count} listeners for "${type}" (max: ${maxListeners})`,
      { tag: 'network', data: { type, count, maxListeners } },
    );
  }
}

export function createNetworkEventEmitter(
  options?: EventEmitterOptions,
): NetworkEventEmitter {
  const maxListeners =
    options?.maxListenersPerEvent ?? DEFAULT_MAX_LISTENERS;
  const listeners: ListenerMap = new Map();

  return {
    on(type, handler) {
      const set = getOrCreateListenerSet(listeners, type);
      const wrapped = handler as (event: NetworkEvent) => void;
      set.add(wrapped);
      checkLeakWarning(type, set.size, maxListeners);
      return () => { set.delete(wrapped); };
    },
    emit(event) {
      const set = listeners.get(event.type);
      if (!set) return;
      for (const handler of set) {
        handler(event);
      }
    },
    listenerCount(type) {
      return listeners.get(type)?.size ?? 0;
    },
    maxListenersPerEvent: maxListeners,
  };
}
