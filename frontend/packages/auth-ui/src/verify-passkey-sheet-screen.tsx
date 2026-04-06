import { useCallback, useMemo, useRef } from "react";
import { CommonActions, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { IONLoader, useTheme } from "@ion/ui";
import { Sheet, useAppNavigation } from "@ion/navigation";
import type { RootStackParamList } from "@ion/navigation";
import { VerifyPasskeyScreen } from "./verify-passkey-screen";

type VerifyPasskeyRoute = RouteProp<RootStackParamList, 'Sheet/VerifyPasskey'>;

function buildNavigateAction(name: string, params?: Record<string, unknown>) {
  const action = params ? CommonActions.navigate(name, params) : CommonActions.navigate(name);
  return action as { type: string; payload: object };
}

function buildResetAction(name: string) {
  return CommonActions.reset({ index: 0, routes: [{ name }] }) as unknown as { type: string; payload: object };
}

function useDismissHandler() {
  const appNavigation = useAppNavigation();
  const route = useRoute<VerifyPasskeyRoute>();
  const dismissedRef = useRef(false);

  return useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    const { next } = route.params;
    appNavigation.goBack();
    requestAnimationFrame(() => {
      if (next.reset) {
        appNavigation.dispatch(buildResetAction(next.name));
      } else {
        appNavigation.dispatch(buildNavigateAction(next.name, next.params));
      }
    });
  }, [appNavigation, route.params]);
}

export function VerifyPasskeySheetScreen() {
  const appNavigation = useAppNavigation();
  const { scale } = useTheme();
  const handleDismiss = useDismissHandler();

  const handleClose = useCallback(() => {
    if (appNavigation.canGoBack()) appNavigation.goBack();
  }, [appNavigation]);

  const loader = useMemo(
    () => <IONLoader variant="light" size={scale.scaleSize(30)} />,
    [scale],
  );

  return (
    <Sheet onClose={handleClose}>
      <VerifyPasskeyScreen
        onDismiss={handleDismiss}
        loadingElement={loader}
      />
    </Sheet>
  );
}
