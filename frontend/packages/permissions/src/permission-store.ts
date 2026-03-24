import {
  type PermissionType,
  PermissionStatus,
  type PermissionResult,
  type PermissionChangeListener,
} from "./types";

const state = new Map<PermissionType, PermissionStatus>();
const listeners = new Set<PermissionChangeListener>();

export function getStatus(type: PermissionType): PermissionStatus {
  return state.get(type) ?? PermissionStatus.Unknown;
}

export function getAll(): Map<PermissionType, PermissionStatus> {
  return new Map(state);
}

export function update(result: PermissionResult): void {
  const current = state.get(result.type);
  if (current === result.status) return;

  state.set(result.type, result.status);
  for (const listener of listeners) {
    listener(result);
  }
}

export function subscribe(
  listener: PermissionChangeListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function clear(): void {
  state.clear();
  listeners.clear();
}
