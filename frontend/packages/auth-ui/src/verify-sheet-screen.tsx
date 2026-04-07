import { useCallback, useEffect, useMemo, useRef } from "react";
import { CommonActions, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { IONLoader, useTheme } from "@ion/ui";
import { Routes, Sheet, useAppNavigation } from "@ion/navigation";
import type { RootStackParamList } from "@ion/navigation";
import { VerifyScreen } from "./verify-screen";
import { wasPasswordConfirmed, getConfirmedPassword, resetPasswordConfirmed } from "./confirm-password-screen";
import { useAuthActions } from "./auth-actions-context";

type VerifyRoute = RouteProp<RootStackParamList, 'Sheet/Verify'>;

function buildNavigateAction(name: string, params?: Record<string, unknown>) {
  const action = params ? CommonActions.navigate(name, params) : CommonActions.navigate(name);
  return action as { type: string; payload: object };
}

function buildResetAction(name: string, params?: Record<string, unknown>) {
  const route = params ? { name, params } : { name };
  return CommonActions.reset({ index: 0, routes: [route] }) as unknown as { type: string; payload: object };
}

function useDismissHandler() {
  const appNavigation = useAppNavigation();
  const route = useRoute<VerifyRoute>();
  const dismissedRef = useRef(false);

  return useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const { next } = route.params;
    appNavigation.goBack();
    requestAnimationFrame(() => {
      if (next.reset) {
        appNavigation.dispatch(buildResetAction(next.name, next.params));
      } else {
        appNavigation.dispatch(buildNavigateAction(next.name, next.params));
      }
    });
  }, [appNavigation, route.params]);
}

function useOpenConfirmPassword(isPasswordMethod: boolean) {
  const appNavigation = useAppNavigation();
  const leftScreenRef = useRef(false);

  useEffect(() => {
    if (!isPasswordMethod || leftScreenRef.current) return;
    resetPasswordConfirmed();
    requestAnimationFrame(() => {
      leftScreenRef.current = true;
      appNavigation.navigate(Routes.Sheet.ConfirmPassword);
    });
  }, [isPasswordMethod, appNavigation]);

  return leftScreenRef;
}

interface PasswordFlowHandlers {
  handleDismiss: () => void;
  handleClose: () => void;
}

interface PasswordFlowConfig {
  isPasswordMethod: boolean;
  identityKeyName: string | undefined;
  handlers: PasswordFlowHandlers;
  leftScreenRef: React.RefObject<boolean>;
}

function usePasswordLoginOnConfirm(config: PasswordFlowConfig) {
  const { isPasswordMethod, identityKeyName, handlers, leftScreenRef } = config;
  const appNavigation = useAppNavigation();
  const { loginWithPassword, onAuthSuccess } = useAuthActions();

  useEffect(() => {
    if (!isPasswordMethod) return;
    const unsubscribe = appNavigation.addListener("focus", () => {
      if (!leftScreenRef.current) return;
      leftScreenRef.current = false;
      if (!wasPasswordConfirmed()) { handlers.handleClose(); return; }
      const password = getConfirmedPassword();
      resetPasswordConfirmed();
      if (!identityKeyName || !password) { handlers.handleDismiss(); return; }
      loginWithPassword(identityKeyName, password).then((result) => {
        if (result.outcome === 'authenticated') { onAuthSuccess(identityKeyName); handlers.handleDismiss(); }
        else { appNavigation.navigate(Routes.Sheet.GeneralError, { errorCode: result.error.numericCode }); handlers.handleClose(); }
      });
    });
    return unsubscribe;
  }, [isPasswordMethod, identityKeyName, appNavigation, loginWithPassword, onAuthSuccess, handlers, leftScreenRef]);
}

function usePasswordFlow(config: { isPasswordMethod: boolean; identityKeyName: string | undefined; handlers: PasswordFlowHandlers }) {
  const leftScreenRef = useOpenConfirmPassword(config.isPasswordMethod);
  usePasswordLoginOnConfirm({ ...config, leftScreenRef });
}

export function VerifySheetScreen() {
  const appNavigation = useAppNavigation();
  const route = useRoute<VerifyRoute>();
  const { scale } = useTheme();
  const method = route.params.method ?? "Passkey";
  const identityKeyName = route.params.identityKeyName;
  const isPasswordMethod = method === "Password";
  const handleDismiss = useDismissHandler();

  const handleClose = useCallback(() => {
    if (appNavigation.canGoBack()) appNavigation.goBack();
  }, [appNavigation]);

  const handlers = useMemo(() => ({ handleDismiss, handleClose }), [handleDismiss, handleClose]);
  usePasswordFlow({ isPasswordMethod, identityKeyName, handlers });

  const loader = useMemo(
    () => <IONLoader variant="light" size={scale.scaleSize(30)} />,
    [scale],
  );

  return (
    <Sheet onClose={handleClose}>
      <VerifyScreen
        onDismiss={handleDismiss}
        loadingElement={loader}
        method={method}
        disableAutoDismiss={isPasswordMethod}
      />
    </Sheet>
  );
}
