import { useCallback, useEffect, useState } from "react";
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

export function usePermission(type: PermissionType): UsePermissionResult {
  const [status, setStatus] = useState(Permissions.getStatus(type));

  useEffect(() => {
    let active = true;
    void Permissions.check(type);
    const unsubscribe = Permissions.subscribe((result) => {
      if (result.type === type && active) {
        setStatus(result.status);
      }
    });
    return () => { active = false; unsubscribe(); };
  }, [type]);

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
