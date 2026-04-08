import { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { CatalogScreen as CatalogScreenCore } from "@ion/ui";
import { Button, useTheme } from "@ion/ui";
import { useAppNavigation, Routes } from "@ion/navigation";
import { hasLinkDeviceBeenShown } from "@ion/auth-ui";

function HeaderButtons() {
  const navigation = useAppNavigation();
  const theme = useTheme();
  const handleMain = useCallback(() => navigation.navigate(Routes.Main), [navigation]);
  const containerStyle = useMemo(() => ({ gap: theme.spacing.sm }), [theme]);

  return (
    <View style={containerStyle}>
      <Button height={44} color="primary" label="Main Screen" onPress={handleMain} />
    </View>
  );
}

function useLinkDevicePrompt() {
  const navigation = useAppNavigation();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (hasLinkDeviceBeenShown()) return;
      timerRef.current = setTimeout(() => {
        navigation.navigate(Routes.Sheet.LinkDevice);
      }, 1000);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [navigation]);
}

export function CatalogScreen() {
  useLinkDevicePrompt();
  return <CatalogScreenCore headerSlot={<HeaderButtons />} />;
}
