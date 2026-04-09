import { useCallback, useMemo } from "react";
import { Image, Platform, StyleSheet, View } from "react-native";
import { Button, Text, useTheme } from "@ion/ui";
import { translate } from "@ion/localization";
import { deleteWalletView } from "@ion/wallet";
import { useWalletViewNavigation } from "@ion/navigation";
import type { RouteProp } from "@react-navigation/native";
import { useRoute } from "@react-navigation/native";
import type { WalletViewSheetParamList } from "@ion/navigation";
import { walletDeleteImage } from "../../assets/wallet-images";

type DeleteRoute = RouteProp<WalletViewSheetParamList, "WalletViewDeleteConfirm">;

function useDeleteHandler(walletId: string) {
  const walletViewNav = useWalletViewNavigation();
  return useCallback(() => {
    try {
      deleteWalletView(walletId);
      walletViewNav.goToSwitcher();
    } catch (error) {
      console.warn("[wallet-view] delete failed:", error instanceof Error ? error.message : error);
    }
  }, [walletId, walletViewNav]);
}

export function DeleteWalletViewConfirmScreen() {
  const { walletId } = useRoute<DeleteRoute>().params;
  const theme = useTheme();
  const scale = theme.scale.scaleSize;
  const walletViewNav = useWalletViewNavigation();
  const handleDelete = useDeleteHandler(walletId);
  const handleCancel = useCallback(() => walletViewNav.goBack(), [walletViewNav]);
  const imageSize = useMemo(() => ({ width: scale(80), height: scale(80) }), [scale]);
  const containerStyle = useMemo(
    () => ({ padding: theme.spacing.lg, gap: scale(6) }),
    [theme.spacing.lg, scale],
  );

  return (
    <View style={[styles.container, containerStyle]}>
      <Image source={walletDeleteImage} style={imageSize} />
      <DeleteWalletViewText colors={theme.colors} gap={theme.spacing.sm} />
      <DeleteWalletViewButtons gap={theme.spacing.lg} onCancel={handleCancel} onDelete={handleDelete} />
    </View>
  );
}

function DeleteWalletViewText({ colors, gap }: { colors: ReturnType<typeof useTheme>["colors"]; gap: number }) {
  const gapStyle = useMemo(() => ({ gap }), [gap]);
  return (
    <View style={[styles.textCenter, gapStyle]}>
      <Text variant="title" color={colors.primaryText}>{translate("walletUi:deleteWalletConfirmTitle")}</Text>
      <Text variant="body2" color={colors.secondaryText} style={styles.description}>{translate("walletUi:deleteWalletConfirmDescription")}</Text>
    </View>
  );
}

function DeleteWalletViewButtons({ gap, onCancel, onDelete }: { gap: number; onCancel: () => void; onDelete: () => void }) {
  const buttonsStyle = useMemo(() => ({ gap, marginTop: gap }), [gap]);
  return (
    <View style={[styles.buttons, buttonsStyle]}>
      <View style={styles.buttonFlex}>
        <Button color="tertiary" label={translate("walletUi:cancelButton")} onPress={onCancel} />
      </View>
      <View style={styles.buttonFlex}>
        <Button color="danger" label={translate("walletUi:deleteButton")} onPress={onDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  textCenter: { alignItems: "center" },
  description: { textAlign: "center" },
  buttons: { flexDirection: "row", ...(Platform.OS === "web" ? { alignSelf: "stretch" as const } : {}) },
  buttonFlex: { flex: 1 },
});
