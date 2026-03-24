import { useCallback, useEffect, useRef, useState } from "react";
import {
  type PermissionType,
  PermissionStatus,
  type PermissionResult,
} from "./types";
import { Permissions } from "./permissions";

export interface UsePermissionResult {
  status: PermissionStatus;
  isGranted: boolean;
  isLimited: boolean;
  isPermanentlyDenied: boolean;
  request: () => Promise<PermissionResult>;
  check: () => Promise<PermissionResult>;
  ensure: () => Promise<PermissionResult>;
}

function usePermissionSubscription(
  type: PermissionType,
  mountedRef: React.RefObject<boolean>,
  setStatus: (status: PermissionStatus) => void,
): void {
  useEffect(() => {
    void Permissions.check(type);
    const unsubscribe = Permissions.subscribe((result) => {
      if (result.type === type && mountedRef.current) {
        setStatus(result.status);
      }
    });
    return unsubscribe;
  }, [type, mountedRef, setStatus]);
}

export function usePermission(type: PermissionType): UsePermissionResult {
  const [status, setStatus] = useState(Permissions.getStatus(type));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  usePermissionSubscription(type, mountedRef, setStatus);

  return {
    status,
    isGranted: status === PermissionStatus.Granted,
    isLimited: status === PermissionStatus.Limited,
    isPermanentlyDenied: status === PermissionStatus.PermanentlyDenied,
    request: useCallback(() => Permissions.request(type), [type]),
    check: useCallback(() => Permissions.check(type), [type]),
    ensure: useCallback(() => Permissions.ensurePermission(type), [type]),
  };
}
