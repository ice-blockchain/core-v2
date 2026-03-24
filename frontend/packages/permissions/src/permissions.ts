import {
  PermissionType,
  PermissionStatus,
  type PermissionResult,
  type PermissionsConfig,
  type PermissionChangeListener,
} from "./types";
import * as store from "./permission-store";
import { checkPermission } from "./platform/check-permission";
import { requestPermission } from "./platform/request-permission";
import { openSettings as platformOpenSettings } from "./platform/open-settings";
import { refreshPermissions } from "./refresh-permissions";

const ALL_TYPES = Object.values(PermissionType);
let trackedTypes: PermissionType[] = ALL_TYPES;
let isInitialized = false;
const inFlightRequests = new Map<PermissionType, Promise<PermissionResult>>();
const inFlightEnsure = new Map<PermissionType, Promise<PermissionResult>>();

function initialize(config?: PermissionsConfig): void {
  trackedTypes = config?.types ?? ALL_TYPES;
  isInitialized = true;
}

async function check(type: PermissionType): Promise<PermissionResult> {
  const result = await checkPermission(type);
  store.update(result);
  return result;
}

async function request(type: PermissionType): Promise<PermissionResult> {
  const existing = inFlightRequests.get(type);
  if (existing) return existing;

  const promise = requestPermission(type).then((result) => {
    store.update(result);
    inFlightRequests.delete(type);
    return result;
  }).catch((error: unknown) => {
    inFlightRequests.delete(type);
    throw error;
  });

  inFlightRequests.set(type, promise);
  return promise;
}

async function ensurePermission(
  type: PermissionType,
): Promise<PermissionResult> {
  const existing = inFlightEnsure.get(type);
  if (existing) return existing;

  const promise = performEnsure(type).finally(() => {
    inFlightEnsure.delete(type);
  });
  inFlightEnsure.set(type, promise);
  return promise;
}

async function performEnsure(
  type: PermissionType,
): Promise<PermissionResult> {
  const current = await check(type);

  if (isGrantedStatus(current.status)) return current;
  if (isTerminalStatus(current.status)) return current;
  if (isReRequestable(current.status)) return request(type);

  if (current.status === PermissionStatus.PermanentlyDenied) {
    await platformOpenSettings();
    await refreshAll();
    return { type, status: store.getStatus(type) };
  }

  return current;
}

function isGrantedStatus(status: PermissionStatus): boolean {
  return (
    status === PermissionStatus.Granted ||
    status === PermissionStatus.Limited
  );
}

function isTerminalStatus(status: PermissionStatus): boolean {
  return (
    status === PermissionStatus.Restricted ||
    status === PermissionStatus.NotAvailable
  );
}

function isReRequestable(status: PermissionStatus): boolean {
  return (
    status === PermissionStatus.Denied ||
    status === PermissionStatus.Unknown
  );
}

async function checkAll(): Promise<Map<PermissionType, PermissionResult>> {
  const results = await Promise.all(trackedTypes.map(check));
  const map = new Map<PermissionType, PermissionResult>();
  for (const result of results) {
    map.set(result.type, result);
  }
  return map;
}

async function refreshAll(): Promise<void> {
  const toRefresh = trackedTypes.filter(
    (t) => !inFlightRequests.has(t),
  );
  await refreshPermissions(toRefresh, checkPermission);
}

function getStatus(type: PermissionType): PermissionStatus {
  return store.getStatus(type);
}

function isGranted(type: PermissionType): boolean {
  return store.getStatus(type) === PermissionStatus.Granted;
}

function isLimited(type: PermissionType): boolean {
  return store.getStatus(type) === PermissionStatus.Limited;
}

function isDenied(type: PermissionType): boolean {
  return store.getStatus(type) === PermissionStatus.Denied;
}

function isPermanentlyDenied(type: PermissionType): boolean {
  return store.getStatus(type) === PermissionStatus.PermanentlyDenied;
}

async function openSettings(): Promise<void> {
  await platformOpenSettings();
}

function subscribe(listener: PermissionChangeListener): () => void {
  return store.subscribe(listener);
}

export const Permissions = {
  initialize,
  check,
  request,
  ensurePermission,
  checkAll,
  refreshAll,
  getStatus,
  isGranted,
  isLimited,
  isDenied,
  isPermanentlyDenied,
  openSettings,
  subscribe,
  get isInitialized(): boolean {
    return isInitialized;
  },
} as const;
